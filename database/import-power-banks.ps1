param(
  [string]$PrimaryWorkbook = "tmp-products-1.xlsx",
  [string]$ValidationWorkbook = "tmp-products-2.xlsx",
  [string]$ImageRoot = "",
  [string]$OutputRoot = "database\generated\power-bank-import",
  [string]$SupabaseUrl = $env:SUPABASE_URL,
  [string]$SupabaseServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$StorageBucket = "product-images",
  [switch]$UploadToSupabase,
  [switch]$SkipImageUpload
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

function ConvertTo-Slug {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }

  $slug = $Value.ToLowerInvariant()
  $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-")
  $slug = $slug.Trim("-")
  return $slug
}

function Get-WebPUploadAsset {
  param(
    [string]$SourcePath,
    [string]$CacheRoot
  )

  $extension = [System.IO.Path]::GetExtension($SourcePath).ToLowerInvariant()
  if ($extension -eq ".webp") {
    return [pscustomobject]@{
      local_path = $SourcePath
      extension  = ".webp"
    }
  }

  $npxCommand = Get-Command npx -ErrorAction SilentlyContinue
  if ($null -eq $npxCommand) {
    return [pscustomobject]@{
      local_path = $SourcePath
      extension  = $extension
    }
  }

  New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
  $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $SourcePath).Hash.Substring(0, 12).ToLowerInvariant()
  $baseName = ConvertTo-Slug ([System.IO.Path]::GetFileNameWithoutExtension($SourcePath))
  if ([string]::IsNullOrWhiteSpace($baseName)) {
    $baseName = "image"
  }

  $targetPath = Join-Path $CacheRoot ("{0}-{1}.webp" -f $baseName, $sourceHash)
  if (-not (Test-Path $targetPath)) {
    & $npxCommand.Source --yes sharp-cli -i $SourcePath -o $targetPath | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $targetPath)) {
      return [pscustomobject]@{
        local_path = $SourcePath
        extension  = $extension
      }
    }
  }

  return [pscustomobject]@{
    local_path = $targetPath
    extension  = ".webp"
  }
}

function Get-XlsxRows {
  param([string]$Path)

  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $sharedStrings = @()
    $sharedEntry = $zip.GetEntry("xl/sharedStrings.xml")
    if ($sharedEntry) {
      $sharedReader = New-Object System.IO.StreamReader($sharedEntry.Open())
      try {
        $sharedXml = [xml]$sharedReader.ReadToEnd()
      } finally {
        $sharedReader.Close()
      }

      foreach ($si in $sharedXml.sst.si) {
        if (($si.PSObject.Properties.Name -contains "t") -and $null -ne $si.t) {
          $sharedStrings += [string]$si.t
        } elseif (($si.PSObject.Properties.Name -contains "r") -and $null -ne $si.r) {
          $sharedStrings += [string]$si.InnerText
        } else {
          $sharedStrings += ""
        }
      }
    }

    $sheetEntry = $zip.GetEntry("xl/worksheets/sheet1.xml")
    if (-not $sheetEntry) {
      throw "Could not find sheet1.xml in workbook: $Path"
    }

    $sheetReader = New-Object System.IO.StreamReader($sheetEntry.Open())
    try {
      $sheetXml = [xml]$sheetReader.ReadToEnd()
    } finally {
      $sheetReader.Close()
    }

    $headerMap = @{}
    $rows = @()
    $sheetRows = @($sheetXml.worksheet.sheetData.row)
    if ($sheetRows.Count -lt 3) {
      throw "Workbook does not contain expected header and data rows: $Path"
    }

    foreach ($cell in $sheetRows[0].c) {
      $column = [regex]::Match($cell.r, "[A-Z]+").Value
      $value = ""
      if ($cell.t -eq "s") {
        $value = $sharedStrings[[int]$cell.v]
      } elseif (($cell.PSObject.Properties.Name -contains "is") -and $null -ne $cell.is) {
        $value = [string]$cell.is.t
      } else {
        $value = [string]$cell.v
      }
      $headerMap[$column] = $value
    }

    for ($index = 2; $index -lt $sheetRows.Count; $index++) {
      $row = $sheetRows[$index]
      if (-not ($row.PSObject.Properties.Name -contains "c")) {
        continue
      }
      $rowObject = [ordered]@{}

      foreach ($cell in $row.c) {
        $column = [regex]::Match($cell.r, "[A-Z]+").Value
        $header = $headerMap[$column]
        if ([string]::IsNullOrWhiteSpace($header)) {
          continue
        }

        $value = ""
        if ($cell.t -eq "s") {
          $value = $sharedStrings[[int]$cell.v]
        } elseif (($cell.PSObject.Properties.Name -contains "is") -and $null -ne $cell.is) {
          $value = [string]$cell.is.t
        } else {
          $value = [string]$cell.v
        }

        $rowObject[$header] = $value
      }

      if ([string]::IsNullOrWhiteSpace([string]$rowObject["Item Name"])) {
        continue
      }

      $rows += [pscustomobject]$rowObject
    }

    return $rows
  } finally {
    $zip.Dispose()
  }
}

function Get-ModelToken {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return $null
  }

  $match = [regex]::Match($Text.ToUpperInvariant(), "(RPP-\d+|FCP-\d+|WP-\d+)")
  if ($match.Success) {
    return $match.Value
  }

  return $null
}

function Normalize-Brand {
  param([string]$Manufacturer, [string]$Name)

  if (-not [string]::IsNullOrWhiteSpace($Manufacturer)) {
    return $Manufacturer.Trim()
  }

  $upperName = [string]$Name
  if ($upperName -match "REMAX|RPP-|FCP-") {
    return "REMAX"
  }
  if ($upperName -match "WEKOME|WP-") {
    return "WEKOME"
  }

  return "Unassigned"
}

function Convert-ToNullableDecimal {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }
  return [decimal]::Parse($Value, [System.Globalization.CultureInfo]::InvariantCulture)
}

function Convert-ToNullableInt {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }
  return [int]$Value
}

function Get-ZipImageIndex {
  param([string]$Root)

  $map = @{}
  Get-ChildItem -Path $Root -Filter *.zip -File | ForEach-Object {
    $token = Get-ModelToken $_.Name
    if ($token) {
      $map[$token] = $_.FullName
    }
  }
  return $map
}

function Get-RowValue {
  param(
    [pscustomobject]$Row,
    [string]$FieldName
  )

  if ($Row.PSObject.Properties.Name -contains $FieldName) {
    return [string]$Row.$FieldName
  }

  return ""
}

function Get-ImageVariantScore {
  param(
    [string]$FileName,
    [string]$Color
  )

  $score = 100
  $lower = $FileName.ToLowerInvariant()

  if ($Color) {
    $normalizedColor = $Color.ToLowerInvariant()
    if ($normalizedColor -match "black" -and ($lower -match "black")) {
      $score = 1
    } elseif ($normalizedColor -match "white" -and ($lower -match "white")) {
      $score = 1
    } elseif ($lower -match "group|combo|all") {
      $score = 3
    }
  } else {
    if ($lower -match "group|combo|all") {
      $score = 2
    } elseif ($lower -match "english") {
      $score = 4
    } elseif ($lower -match "package|packing|box") {
      $score = 5
    } else {
      $score = 3
    }
  }

  return $score
}

function Expand-ProductImages {
  param(
    [pscustomobject]$Product,
    [string]$ZipPath,
    [string]$OutputFolder
  )

  if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
  }

  $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    $entries = @(
      $zip.Entries |
      Where-Object { -not $_.FullName.EndsWith("/") -and $_.Name -match "\.(jpg|jpeg|png|webp)$" }
    )

    $orderedEntries = $entries |
      Sort-Object @{
        Expression = { Get-ImageVariantScore -FileName $_.Name -Color $Product.color }
      }, @{
        Expression = { $_.Name }
      }

    $results = @()
    $index = 0
    foreach ($entry in $orderedEntries) {
      $index++
      $extension = [System.IO.Path]::GetExtension($entry.Name).ToLowerInvariant()
      $safeBaseName = ConvertTo-Slug ([System.IO.Path]::GetFileNameWithoutExtension($entry.Name))
      if ([string]::IsNullOrWhiteSpace($safeBaseName)) {
        $safeBaseName = "image-$index"
      }

      $targetName = "{0:D2}-{1}{2}" -f $index, $safeBaseName, $extension
      $targetPath = Join-Path $OutputFolder $targetName

      $inputStream = $entry.Open()
      try {
        $outputStream = [System.IO.File]::Open($targetPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
        try {
          $inputStream.CopyTo($outputStream)
        } finally {
          $outputStream.Dispose()
        }
      } finally {
        $inputStream.Dispose()
      }

      $results += [pscustomobject]@{
        local_path = $targetPath
        file_name = $targetName
        sort_order = $index
      }
    }

    return $results
  } finally {
    $zip.Dispose()
  }
}

function Invoke-SupabaseRest {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [string]$Prefer = "return=representation"
  )

  $headers = @{
    "apikey" = $SupabaseServiceRoleKey
    "Authorization" = "Bearer $SupabaseServiceRoleKey"
  }

  if ($Prefer) {
    $headers["Prefer"] = $Prefer
  }

  $uri = "{0}/rest/v1/{1}" -f $SupabaseUrl.TrimEnd("/"), $Path.TrimStart("/")

  try {
    if ($null -eq $Body) {
      return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
    }

    $json = $Body | ConvertTo-Json -Depth 10 -Compress
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $json
  } catch {
    $message = $_.Exception.Message
    $statusCode = $null
    $responseBody = $null

    if ($_.Exception.Response) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
      } catch {
        $statusCode = $null
      }

      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          try {
            $responseBody = $reader.ReadToEnd()
          } finally {
            $reader.Dispose()
          }
        }
      } catch {
        $responseBody = $null
      }
    }

    Write-Host ""
    Write-Host "Supabase REST request failed." -ForegroundColor Red
    Write-Host ("Method: {0}" -f $Method)
    Write-Host ("URI: {0}" -f $uri)
    if ($statusCode -ne $null) {
      Write-Host ("Status: {0}" -f $statusCode)
    }
    Write-Host ("Message: {0}" -f $message)
    if (-not [string]::IsNullOrWhiteSpace($responseBody)) {
      Write-Host ("Response: {0}" -f $responseBody)
    }
    throw
  }
}

function Upload-ToSupabaseStorage {
  param(
    [string]$LocalPath,
    [string]$StoragePath
  )

  $extension = [System.IO.Path]::GetExtension($LocalPath).ToLowerInvariant()
  $contentType = switch ($extension) {
    ".png" { "image/png" }
    ".webp" { "image/webp" }
    ".jpeg" { "image/jpeg" }
    default { "image/jpeg" }
  }

  $uri = "{0}/storage/v1/object/{1}/{2}" -f $SupabaseUrl.TrimEnd("/"), $StorageBucket, $StoragePath.TrimStart("/")

  $headers = @{
    "apikey" = $SupabaseServiceRoleKey
    "Authorization" = "Bearer $SupabaseServiceRoleKey"
    "x-upsert" = "true"
  }

  Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType $contentType -InFile $LocalPath | Out-Null
  return "{0}/storage/v1/object/public/{1}/{2}" -f $SupabaseUrl.TrimEnd("/"), $StorageBucket, $StoragePath.TrimStart("/")
}

function Get-OrCreateCategoryId {
  $existing = Invoke-SupabaseRest -Method Get -Path "categories?slug=eq.power-banks&select=id,slug"
  if ($existing.Count -gt 0) {
    return [int64]$existing[0].id
  }

  $created = Invoke-SupabaseRest -Method Post -Path "categories?select=id,slug" -Body @{
    slug = "power-banks"
    name = "Power Banks"
    description = "Portable chargers, magnetic battery packs and fast charging power banks."
    sort_order = 30
  }
  return [int64]$created[0].id
}

function Get-OrCreateSupplierId {
  param([string]$SupplierName)

  $escaped = [System.Uri]::EscapeDataString($SupplierName)
  $existing = Invoke-SupabaseRest -Method Get -Path "suppliers?name=eq.$escaped&select=id,name"
  if ($existing.Count -gt 0) {
    return [int64]$existing[0].id
  }

  $website = if ($SupplierName -eq "WEKOME") { "https://www.wekome.com/" } else { "https://www.remax.net/" }
  $created = Invoke-SupabaseRest -Method Post -Path "suppliers?select=id,name" -Body @{
    name = $SupplierName
    website_url = $website
    notes = "Imported from TECHM8 supplier Excel on 2026-04-20."
  }
  return [int64]$created[0].id
}

function Get-WarehouseStoreId {
  $existing = Invoke-SupabaseRest -Method Get -Path "stores?slug=eq.warehouse-dispatch&select=id,slug"
  if ($existing.Count -eq 0) {
    throw "Store 'warehouse-dispatch' was not found. Run existing warehouse migration first."
  }
  return [int64]$existing[0].id
}

function Upsert-Product {
  param(
    [pscustomobject]$Product,
    [int64]$CategoryId,
    [int64]$SupplierId
  )

  $body = @(
    @{
      sku = $Product.sku
      slug = $Product.slug
      name = $Product.name
      brand = $Product.brand
      model = $Product.model
      upc = $Product.upc
      category_id = $CategoryId
      supplier_id = $SupplierId
      short_description = $Product.short_description
      description = $Product.description
      condition_label = $Product.condition_label
      compatibility = $Product.compatibility
      cost_price = $Product.cost_price
      retail_price = $Product.retail_price
      compare_at_price = $Product.compare_at_price
      image_url = $Product.image_url
      supplier_image_url = $Product.image_url
      supplier_product_url = $null
      stock_quantity = $Product.stock_quantity
      min_order_quantity = 1
      is_featured = $false
      is_visible = $true
      seo_title = $Product.name
      seo_description = $Product.short_description
    }
  )

  $result = Invoke-SupabaseRest -Method Post -Path "products?on_conflict=sku&select=id,sku,slug" -Body $body -Prefer "resolution=merge-duplicates,return=representation"
  return [int64]$result[0].id
}

function Upsert-WarehouseInventory {
  param(
    [int64]$ProductId,
    [int64]$StoreId,
    [int]$Quantity,
    [string]$ShelfLocation
  )

  $body = @(
    @{
      product_id = $ProductId
      store_id = $StoreId
      quantity = $Quantity
      shelf_location = $ShelfLocation
    }
  )

  Invoke-SupabaseRest -Method Post -Path "product_store_inventory?on_conflict=product_id,store_id&select=product_id" -Body $body -Prefer "resolution=merge-duplicates,return=representation" | Out-Null
}

function Replace-ProductImages {
  param(
    [int64]$ProductId,
    [array]$Images
  )

  Invoke-SupabaseRest -Method Delete -Path "product_images?product_id=eq.$ProductId" -Prefer "return=minimal" | Out-Null

  if ($Images.Count -eq 0) {
    return
  }

  $rows = @()
  foreach ($image in $Images) {
    $rows += @{
      product_id = $ProductId
      image_url = $image.public_url
      alt_text = $image.alt_text
      sort_order = $image.sort_order
    }
  }

  Invoke-SupabaseRest -Method Post -Path "product_images?select=id" -Body $rows | Out-Null
}

if (-not (Test-Path $PrimaryWorkbook)) {
  throw "Primary workbook not found: $PrimaryWorkbook"
}

if (-not (Test-Path $ValidationWorkbook)) {
  throw "Validation workbook not found: $ValidationWorkbook"
}

if ([string]::IsNullOrWhiteSpace($ImageRoot)) {
  throw "ImageRoot is required. Example: -ImageRoot 'E:\\...\\power-bank-images'"
}

if (-not (Test-Path $ImageRoot)) {
  throw "Image root not found: $ImageRoot"
}

if ($UploadToSupabase) {
  if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) {
    throw "SUPABASE_URL is required when -UploadToSupabase is used."
  }
  if ([string]::IsNullOrWhiteSpace($SupabaseServiceRoleKey)) {
    throw "SUPABASE_SERVICE_ROLE_KEY is required when -UploadToSupabase is used."
  }
}

$primaryRows = Get-XlsxRows -Path $PrimaryWorkbook
$validationRows = Get-XlsxRows -Path $ValidationWorkbook

if ($primaryRows.Count -ne $validationRows.Count) {
  Write-Warning "Validation workbook row count differs from primary workbook. Using primary workbook only."
}

$zipIndex = Get-ZipImageIndex -Root $ImageRoot
$outputAbsolute = Join-Path (Get-Location) $OutputRoot
$imagesRoot = Join-Path $outputAbsolute "images"
New-Item -ItemType Directory -Path $imagesRoot -Force | Out-Null

$products = @()
$matchedImageCount = 0
$missingImageModels = New-Object System.Collections.Generic.List[string]

foreach ($row in $primaryRows) {
  $name = Get-RowValue -Row $row -FieldName "Item Name"
  $model = Get-ModelToken $name
  $manufacturer = Get-RowValue -Row $row -FieldName "Manufacturer"
  $brand = Normalize-Brand -Manufacturer $manufacturer -Name $name
  $skuValue = Get-RowValue -Row $row -FieldName "SKU"
  $upcValue = Get-RowValue -Row $row -FieldName "UPC"
  $description = Get-RowValue -Row $row -FieldName "Description"
  $color = Get-RowValue -Row $row -FieldName "Color"
  $location = Get-RowValue -Row $row -FieldName "Physical Location"
  $onHand = Convert-ToNullableInt (Get-RowValue -Row $row -FieldName "On Hand Qty")
  $costPrice = Convert-ToNullableDecimal (Get-RowValue -Row $row -FieldName "Cost Price")
  $retailPrice = Convert-ToNullableDecimal (Get-RowValue -Row $row -FieldName "Retail Price")
  $onlinePrice = Convert-ToNullableDecimal (Get-RowValue -Row $row -FieldName "Online Price")
  $promoPrice = Convert-ToNullableDecimal (Get-RowValue -Row $row -FieldName "Promotional Price")
  $condition = Get-RowValue -Row $row -FieldName "Condition"

  $effectiveRetail = $retailPrice
  $compareAt = $null

  if ($promoPrice -and $promoPrice -gt 0 -and $retailPrice -and $promoPrice -lt $retailPrice) {
    $effectiveRetail = $promoPrice
    $compareAt = $retailPrice
  } elseif ($onlinePrice -and $onlinePrice -gt 0 -and $retailPrice -and $onlinePrice -lt $retailPrice) {
    $effectiveRetail = $onlinePrice
    $compareAt = $retailPrice
  }

  if ([string]::IsNullOrWhiteSpace($skuValue)) {
    $skuValue = if ($model) { "TM8-$model" } else { "TM8-" + (ConvertTo-Slug $name) }
  }

  $slug = ConvertTo-Slug $name
  $productOutputFolder = Join-Path $imagesRoot $slug

  $localImages = @()
  if ($model -and $zipIndex.ContainsKey($model)) {
    $localImages = Expand-ProductImages -Product ([pscustomobject]@{ color = $color }) -ZipPath $zipIndex[$model] -OutputFolder $productOutputFolder
    $matchedImageCount += $localImages.Count
  } else {
    if ($model) {
      $missingImageModels.Add($model)
    } else {
      $missingImageModels.Add($name)
    }
  }

  $shortDescription = if (-not [string]::IsNullOrWhiteSpace($description)) {
    $description.Trim()
  } else {
    "{0} available for online and warehouse dispatch." -f $name.Trim()
  }

  $products += [pscustomobject]@{
    sku = $skuValue.Trim()
    slug = $slug
    name = $name.Trim()
    brand = $brand
    model = if ($model) { $model } else { $name.Trim() }
    upc = if ([string]::IsNullOrWhiteSpace($upcValue)) { $null } else { $upcValue.Trim() }
    stock_quantity = if ($onHand) { $onHand } else { 0 }
    cost_price = $costPrice
    retail_price = $effectiveRetail
    compare_at_price = $compareAt
    condition_label = if ([string]::IsNullOrWhiteSpace($condition)) { "New" } else { $condition.Trim() }
    short_description = $shortDescription
    description = $shortDescription
    compatibility = "Portable charging devices"
    category_name = "Power Banks"
    warehouse_location = if ([string]::IsNullOrWhiteSpace($location)) { $null } else { $location.Trim() }
    color = if ([string]::IsNullOrWhiteSpace($color)) { $null } else { $color.Trim() }
    image_files = $localImages
    image_url = $null
  }
}

$summary = [pscustomobject]@{
  generated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
  source_workbook = $PrimaryWorkbook
  validation_workbook = $ValidationWorkbook
  total_products = $products.Count
  matched_image_files = $matchedImageCount
  missing_image_matches = ($missingImageModels | Sort-Object -Unique)
}

New-Item -ItemType Directory -Path $outputAbsolute -Force | Out-Null
$webpCacheRoot = Join-Path $outputAbsolute "_webp-cache"
$products | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $outputAbsolute "products.json") -Encoding UTF8
$summary | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $outputAbsolute "summary.json") -Encoding UTF8

if (-not $UploadToSupabase) {
  Write-Host "Preview complete. No data uploaded."
  Write-Host ("Products parsed: {0}" -f $products.Count)
  Write-Host ("Matched local image files: {0}" -f $matchedImageCount)
  if ($summary.missing_image_matches.Count -gt 0) {
    Write-Host "Products without local image package:"
    $summary.missing_image_matches | ForEach-Object { Write-Host (" - {0}" -f $_) }
  }
  exit 0
}

$categoryId = Get-OrCreateCategoryId
$warehouseStoreId = Get-WarehouseStoreId
$supplierIds = @{}

foreach ($product in $products) {
  if (-not $supplierIds.ContainsKey($product.brand)) {
    $supplierIds[$product.brand] = Get-OrCreateSupplierId -SupplierName $product.brand
  }

  $uploadedImages = @()
  if (-not $SkipImageUpload) {
    foreach ($image in $product.image_files) {
      $uploadAsset = Get-WebPUploadAsset -SourcePath $image.local_path -CacheRoot $webpCacheRoot
      $safeBaseName = ConvertTo-Slug ([System.IO.Path]::GetFileNameWithoutExtension($image.file_name))
      if ([string]::IsNullOrWhiteSpace($safeBaseName)) {
        $safeBaseName = "image"
      }
      $safeFileName = "{0:D2}-{1}{2}" -f $image.sort_order, $safeBaseName, $uploadAsset.extension
      $storagePath = "products/power-banks/{0}/{1}" -f $product.slug, $safeFileName
      $publicUrl = Upload-ToSupabaseStorage -LocalPath $uploadAsset.local_path -StoragePath $storagePath
      $uploadedImages += [pscustomobject]@{
        public_url = $publicUrl
        alt_text = $product.name
        sort_order = $image.sort_order
      }
    }
  }

  if ($uploadedImages.Count -gt 0) {
    $product.image_url = $uploadedImages[0].public_url
  }

  $productId = Upsert-Product -Product $product -CategoryId $categoryId -SupplierId $supplierIds[$product.brand]
  Upsert-WarehouseInventory -ProductId $productId -StoreId $warehouseStoreId -Quantity $product.stock_quantity -ShelfLocation $product.warehouse_location
  Replace-ProductImages -ProductId $productId -Images $uploadedImages
}

Write-Host ("Upload complete. Imported or updated {0} products." -f $products.Count)
