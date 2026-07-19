$ErrorActionPreference = "Stop"

$repository = "bowenmiao-tech/TECHM8-NEW-WEBSITE"
$functionUrl = "https://fwlronvmgqzkleofriis.supabase.co/functions/v1/catalog-refresh-hook"

Write-Host "Create a fine-grained GitHub token restricted to $repository."
Write-Host "Grant only Repository permissions > Contents > Read and write."
$secureToken = Read-Host "Paste the token (input is hidden)" -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)

try {
  $githubToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
  if ([string]::IsNullOrWhiteSpace($githubToken)) {
    throw "A GitHub token is required."
  }

  $randomBytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Fill($randomBytes)
  $webhookSecret = [Convert]::ToHexString($randomBytes).ToLowerInvariant()

  & supabase secrets set `
    "GITHUB_CATALOG_DISPATCH_TOKEN=$githubToken" `
    "GITHUB_REPOSITORY=$repository" `
    "CATALOG_WEBHOOK_SECRET=$webhookSecret"
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase Edge Function secrets could not be configured."
  }

  $escapedUrl = $functionUrl.Replace("'", "''")
  $escapedSecret = $webhookSecret.Replace("'", "''")
  $vaultSql = @"
do `$setup`$
declare
  url_secret_id uuid;
  webhook_secret_id uuid;
begin
  select id into url_secret_id
  from vault.secrets
  where name = 'catalog_refresh_webhook_url';

  if url_secret_id is null then
    perform vault.create_secret('$escapedUrl', 'catalog_refresh_webhook_url', 'Catalog refresh Edge Function URL');
  else
    perform vault.update_secret(url_secret_id, '$escapedUrl', 'catalog_refresh_webhook_url', 'Catalog refresh Edge Function URL');
  end if;

  select id into webhook_secret_id
  from vault.secrets
  where name = 'catalog_refresh_webhook_secret';

  if webhook_secret_id is null then
    perform vault.create_secret('$escapedSecret', 'catalog_refresh_webhook_secret', 'Shared secret for catalog refresh events');
  else
    perform vault.update_secret(webhook_secret_id, '$escapedSecret', 'catalog_refresh_webhook_secret', 'Shared secret for catalog refresh events');
  end if;
end
`$setup`$;
"@

  & supabase db query --linked $vaultSql --output table
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase Vault secrets could not be configured."
  }

  $body = @{
    schema = "public"
    table = "products"
    type = "UPDATE"
    requested_at = [DateTimeOffset]::UtcNow.ToString("o")
  } | ConvertTo-Json -Compress
  $response = Invoke-WebRequest `
    -UseBasicParsing `
    -Method Post `
    -Uri $functionUrl `
    -Headers @{ "x-webhook-secret" = $webhookSecret } `
    -ContentType "application/json" `
    -Body $body

  if ($response.StatusCode -ne 202) {
    throw "The test dispatch returned HTTP $($response.StatusCode)."
  }

  Write-Host "Catalog refresh is configured. A test GitHub refresh was dispatched." -ForegroundColor Green
} finally {
  if ($tokenPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
  }
  $githubToken = $null
  $webhookSecret = $null
  $secureToken = $null
}
