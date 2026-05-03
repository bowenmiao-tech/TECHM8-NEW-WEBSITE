param(
  [string]$CsvPath = "contacts.csv",
  [string]$OutputSql = "database\generated\legacy-contacts-import.sql",
  [switch]$ExecuteLinked
)

$ErrorActionPreference = "Stop"

function Sql-Text {
  param([AllowNull()][object]$Value)
  if ($null -eq $Value) { return "null" }
  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) { return "null" }
  return "'" + $text.Replace("'", "''") + "'"
}

function Sql-Timestamp {
  param([AllowNull()][object]$Value)
  if ($null -eq $Value) { return "null" }
  $text = ([string]$Value).Trim()
  if (-not $text) { return "null" }
  $formats = @(
    "yyyy-MM-dd HH:mm",
    "yyyy-MM-dd HH:mm:ss",
    "yyyy/MM/dd HH:mm",
    "yyyy/MM/dd HH:mm:ss"
  )
  $parsed = [DateTime]::MinValue
  if ([DateTime]::TryParseExact($text, $formats, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal, [ref]$parsed) -or [DateTime]::TryParse($text, [ref]$parsed)) {
    return "'" + $parsed.ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + "+00'"
  }
  return "null"
}

function Normalize-Email {
  param([AllowNull()][object]$Value)
  $text = ([string]$Value).Trim().ToLowerInvariant()
  if ($text -match "^[^@\s]+@[^@\s]+\.[^@\s]+$") { return $text }
  return ""
}

function Normalize-Phone {
  param([AllowNull()][object]$Value)
  $text = ([string]$Value).Trim()
  if (-not $text) { return "" }
  $text = $text.Trim("'`" ")
  $digits = ($text -replace "[^\d+]", "")
  if ($digits.StartsWith("+61")) {
    return "0" + $digits.Substring(3)
  }
  if ($digits.StartsWith("61") -and $digits.Length -ge 11) {
    return "0" + $digits.Substring(2)
  }
  return $digits
}

function Get-ContactKey {
  param(
    [string]$Email,
    [string]$Phone,
    [object]$Row
  )
  if ($Email) { return "email:" + $Email }
  if ($Phone) { return "phone:" + (($Phone -replace "\D", "")) }
  $basis = @(
    $Row.'First Name',
    $Row.'Last Name',
    $Row.'Address 1 - Street',
    $Row.'Created At (UTC+0)'
  ) -join "|"
  $bytes = [Text.Encoding]::UTF8.GetBytes($basis)
  $hashBytes = [Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
  return "legacy:" + ([BitConverter]::ToString($hashBytes).Replace("-", "").ToLowerInvariant()).Substring(0, 24)
}

if (-not (Test-Path -LiteralPath $CsvPath)) {
  throw "CSV file not found: $CsvPath"
}

$contacts = Import-Csv -LiteralPath $CsvPath
$outputFullPath = Join-Path (Get-Location) $OutputSql
$outputDirectory = Split-Path -Parent $outputFullPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$columns = @(
  "contact_key",
  "first_name",
  "last_name",
  "full_name",
  "email",
  "email_normalized",
  "phone_primary",
  "phone_secondary",
  "phone_other",
  "company",
  "business_name",
  "abn_crn",
  "labels",
  "address_type",
  "address_line_1",
  "address_line_2",
  "suburb",
  "state",
  "postcode",
  "country",
  "billing_address_line_1",
  "billing_suburb",
  "billing_state",
  "billing_postcode",
  "billing_country",
  "email_subscriber_status",
  "sms_subscriber_status",
  "last_activity",
  "last_activity_at",
  "source",
  "language",
  "external_created_at",
  "raw_data"
)

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("begin;")
$lines.Add((Get-Content "supabase\migrations\20260503_customer_contacts.sql" -Raw))
$lines.Add("insert into public.customer_contacts (" + ($columns -join ", ") + ") values")

$valueLines = New-Object System.Collections.Generic.List[string]
$seenContactKeys = New-Object "System.Collections.Generic.HashSet[string]"
$skippedDuplicateCount = 0
foreach ($row in $contacts) {
  $firstName = ([string]$row.'First Name').Trim()
  $lastName = ([string]$row.'Last Name').Trim()
  $fullName = (@($firstName, $lastName) | Where-Object { $_ }) -join " "
  $email = Normalize-Email $row.'Email 1'
  $phone1 = Normalize-Phone $row.'Phone 1'
  $phone2 = Normalize-Phone $row.'Phone 2'
  $phone3 = Normalize-Phone $row.'Phone 3'
  $contactKey = Get-ContactKey -Email $email -Phone $phone1 -Row $row
  if (-not $seenContactKeys.Add($contactKey)) {
    $skippedDuplicateCount++
    continue
  }
  $rawJson = $row | ConvertTo-Json -Compress -Depth 6

  $values = @(
    (Sql-Text $contactKey),
    (Sql-Text $firstName),
    (Sql-Text $lastName),
    (Sql-Text $fullName),
    (Sql-Text $email),
    (Sql-Text $email),
    (Sql-Text $phone1),
    (Sql-Text $phone2),
    (Sql-Text $phone3),
    (Sql-Text $row.Company),
    (Sql-Text $row.'Bussiness Name'),
    (Sql-Text $row.'ABN/CRN'),
    (Sql-Text $row.Labels),
    (Sql-Text $row.'Address 1 - Type'),
    (Sql-Text $row.'Address 1 - Street'),
    (Sql-Text $row.'Address 1 - Street Line 2'),
    (Sql-Text $row.'Address 1 - City'),
    (Sql-Text $row.'Address 1 - State/Region'),
    (Sql-Text $row.'Address 1 - Zip'),
    (Sql-Text $row.'Address 1 - Country'),
    (Sql-Text $row.'Address 2 - Street'),
    (Sql-Text $row.'Address 2 - City'),
    (Sql-Text $row.'Address 2 - State/Region'),
    (Sql-Text $row.'Address 2 - Zip'),
    (Sql-Text $row.'Address 2 - Country'),
    (Sql-Text $row.'Email subscriber status'),
    (Sql-Text $row.'SMS subscriber status'),
    (Sql-Text $row.'Last Activity'),
    (Sql-Timestamp $row.'Last Activity Date (UTC+0)'),
    (Sql-Text $row.Source),
    (Sql-Text $row.Language),
    (Sql-Timestamp $row.'Created At (UTC+0)'),
    ((Sql-Text $rawJson) + "::jsonb")
  )

  $valueLines.Add("  (" + ($values -join ", ") + ")")
}

$lines.Add(($valueLines -join ",`n") + @"

on conflict (contact_key) do update
set
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  full_name = excluded.full_name,
  email = excluded.email,
  email_normalized = excluded.email_normalized,
  phone_primary = excluded.phone_primary,
  phone_secondary = excluded.phone_secondary,
  phone_other = excluded.phone_other,
  company = excluded.company,
  business_name = excluded.business_name,
  abn_crn = excluded.abn_crn,
  labels = excluded.labels,
  address_type = excluded.address_type,
  address_line_1 = excluded.address_line_1,
  address_line_2 = excluded.address_line_2,
  suburb = excluded.suburb,
  state = excluded.state,
  postcode = excluded.postcode,
  country = excluded.country,
  billing_address_line_1 = excluded.billing_address_line_1,
  billing_suburb = excluded.billing_suburb,
  billing_state = excluded.billing_state,
  billing_postcode = excluded.billing_postcode,
  billing_country = excluded.billing_country,
  email_subscriber_status = excluded.email_subscriber_status,
  sms_subscriber_status = excluded.sms_subscriber_status,
  last_activity = excluded.last_activity,
  last_activity_at = excluded.last_activity_at,
  source = excluded.source,
  language = excluded.language,
  external_created_at = excluded.external_created_at,
  raw_data = excluded.raw_data,
  updated_at = now();

update public.customer_contacts cc
set auth_user_id = p.id
from public.profiles p
where cc.auth_user_id is null
  and cc.email_normalized is not null
  and lower(coalesce(p.email, '')) = cc.email_normalized;

commit;
"@)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputFullPath, ($lines -join "`n"), $utf8NoBom)

$emailCount = ($contacts | Where-Object { Normalize-Email $_.'Email 1' }).Count
$phoneCount = ($contacts | Where-Object { Normalize-Phone $_.'Phone 1' }).Count
Write-Host "Generated $outputFullPath"
Write-Host "Rows: $($contacts.Count), rows with email: $emailCount, rows with primary phone: $phoneCount, duplicate rows skipped: $skippedDuplicateCount"

if ($ExecuteLinked) {
  supabase db query --linked --file $outputFullPath
}
