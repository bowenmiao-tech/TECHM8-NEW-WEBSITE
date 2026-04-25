param(
  [string]$SupabaseUrl = $env:SUPABASE_URL,
  [string]$SupabaseServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$StorageBucket = "product-images",
  [string]$OutputRoot = "database\generated\webp-migration",
  [switch]$IncludeHiddenProducts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertTo-Slug {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) { return "item" }

  $slug = $Value.ToLowerInvariant()
  $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-")
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) { return "item" }
  return $slug
}

function Get-ScalarInt64 {
  param([object]$Value)

  $candidate = @($Value)[0]
  if ($null -eq $candidate -or [string]::IsNullOrWhiteSpace([string]$candidate)) {
    throw "Expected integer-compatible value but received empty data."
  }

  return [int64]$candidate
}

function ConvertTo-RestRows {
  param([object]$Value)

  if ($null -eq $Value) { return @() }

  $wrapped = @($Value)
  if ($wrapped.Count -eq 1 -and $wrapped[0] -is [System.Array]) {
    return @($wrapped[0])
  }

  return $wrapped
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
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
  }

  $json = $Body | ConvertTo-Json -Depth 12 -Compress
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $json
}

function Upload-ToSupabaseStorage {
  param(
    [string]$LocalPath,
    [string]$StoragePath
  )

  $contentType = "image/webp"
  $uri = "{0}/storage/v1/object/{1}/{2}" -f $SupabaseUrl.TrimEnd("/"), $StorageBucket, $StoragePath.TrimStart("/")
  $headers = @{
    "apikey" = $SupabaseServiceRoleKey
    "Authorization" = "Bearer $SupabaseServiceRoleKey"
    "x-upsert" = "true"
  }

  Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType $contentType -InFile $LocalPath | Out-Null
  return "{0}/storage/v1/object/public/{1}/{2}" -f $SupabaseUrl.TrimEnd("/"), $StorageBucket, $StoragePath.TrimStart("/")
}

function Get-SupabasePublicPrefix {
  return "{0}/storage/v1/object/public/{1}/" -f $SupabaseUrl.TrimEnd("/"), $StorageBucket
}

function Get-WebPFileFromUrl {
  param(
    [string]$SourceUrl,
    [string]$DownloadRoot,
    [string]$CacheRoot,
    [string]$BaseName
  )

  $npxCommand = Get-Command npx -ErrorAction SilentlyContinue
  if ($null -eq $npxCommand) {
    throw "npx is required to convert images to WebP."
  }

  New-Item -ItemType Directory -Path $DownloadRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null

  $sourceHash = ([System.BitConverter]::ToString(
      [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($SourceUrl))
    ) -replace "-", "").Substring(0, 16).ToLowerInvariant()
  $downloadPath = Join-Path $DownloadRoot ("{0}-{1}.source" -f (ConvertTo-Slug $BaseName), $sourceHash)
  $targetPath = Join-Path $CacheRoot ("{0}-{1}.webp" -f (ConvertTo-Slug $BaseName), $sourceHash)

  if (-not (Test-Path $downloadPath)) {
    Invoke-WebRequest -Uri $SourceUrl -OutFile $downloadPath
  }

  if (-not (Test-Path $targetPath)) {
    & $npxCommand.Source --yes sharp-cli -i $downloadPath -o $targetPath | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $targetPath)) {
      throw "WebP conversion failed for $SourceUrl"
    }
  }

  return $targetPath
}

function Get-TargetStoragePath {
  param(
    [string]$SourceUrl,
    [string]$ProductSlug,
    [string]$FallbackName
  )

  $publicPrefix = Get-SupabasePublicPrefix
  $normalizedSource = [string]$SourceUrl
  if ($normalizedSource.StartsWith($publicPrefix)) {
    $existingPath = $normalizedSource.Substring($publicPrefix.Length)
    return ([System.IO.Path]::ChangeExtension($existingPath, ".webp") -replace "\\", "/")
  }

  $safeProductSlug = ConvertTo-Slug $ProductSlug
  $safeName = ConvertTo-Slug $FallbackName
  return "products/{0}/{1}.webp" -f $safeProductSlug, $safeName
}

function Update-ProductMainImage {
  param(
    [int64]$ProductId,
    [string]$NewUrl,
    [string]$OldUrl
  )

  $rows = Invoke-SupabaseRest -Method Patch -Path ("products?id=eq.{0}&select=id,image_url,supplier_image_url" -f $ProductId) -Body @{
    image_url = $NewUrl
    supplier_image_url = $NewUrl
  }

  return $rows
}

if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) {
  throw "SUPABASE_URL is required."
}

if ([string]::IsNullOrWhiteSpace($SupabaseServiceRoleKey)) {
  throw "SUPABASE_SERVICE_ROLE_KEY is required."
}

$outputAbsolute = Join-Path (Get-Location) $OutputRoot
$downloadRoot = Join-Path $outputAbsolute "downloads"
$cacheRoot = Join-Path $outputAbsolute "webp"
New-Item -ItemType Directory -Path $outputAbsolute -Force | Out-Null

$productsPath = if ($IncludeHiddenProducts) {
  "products?select=id,sku,slug,name,image_url,supplier_image_url,is_visible&order=id.asc"
} else {
  "products?select=id,sku,slug,name,image_url,supplier_image_url,is_visible&is_visible=eq.true&order=id.asc"
}

$products = ConvertTo-RestRows (Invoke-SupabaseRest -Method Get -Path $productsPath)
$galleryRows = ConvertTo-RestRows (Invoke-SupabaseRest -Method Get -Path "product_images?select=id,product_id,image_url,alt_text,sort_order,products(id,sku,slug,name,image_url,supplier_image_url)&order=product_id.asc&order=sort_order.asc")

$results = New-Object System.Collections.Generic.List[object]

foreach ($row in $galleryRows) {
  $product = $row.products
  if ($null -eq $product) { continue }

  $sourceUrl = [string]$row.image_url
  if ([string]::IsNullOrWhiteSpace($sourceUrl)) { continue }
  if ($sourceUrl -match "\.webp(\?|$)") {
    $results.Add([pscustomobject]@{
      type = "gallery"
      product_id = $product.id
      product_slug = $product.slug
      image_id = $row.id
      status = "skipped"
      reason = "already_webp"
      source_url = $sourceUrl
    })
    continue
  }

  try {
    $convertedPath = Get-WebPFileFromUrl -SourceUrl $sourceUrl -DownloadRoot $downloadRoot -CacheRoot $cacheRoot -BaseName ("{0}-{1:00}" -f $product.slug, [int]$row.sort_order)
    $storagePath = Get-TargetStoragePath -SourceUrl $sourceUrl -ProductSlug $product.slug -FallbackName ("{0}-{1:00}" -f $product.slug, [int]$row.sort_order)
    $publicUrl = Upload-ToSupabaseStorage -LocalPath $convertedPath -StoragePath $storagePath

    Invoke-SupabaseRest -Method Patch -Path ("product_images?id=eq.{0}&select=id,image_url" -f $row.id) -Body @{
      image_url = $publicUrl
    } | Out-Null

    if ([int]$row.sort_order -eq 0 -or [string]$product.image_url -eq $sourceUrl) {
      Update-ProductMainImage -ProductId ([int64]$product.id) -NewUrl $publicUrl -OldUrl $sourceUrl | Out-Null
    }

    $results.Add([pscustomobject]@{
      type = "gallery"
      product_id = $product.id
      product_slug = $product.slug
      image_id = $row.id
      status = "updated"
      source_url = $sourceUrl
      storage_path = $storagePath
      public_url = $publicUrl
    })
  } catch {
    $results.Add([pscustomobject]@{
      type = "gallery"
      product_id = $product.id
      product_slug = $product.slug
      image_id = $row.id
      status = "error"
      source_url = $sourceUrl
      error = $_.Exception.Message
    })
  }
}

$productsWithGallery = @{}
foreach ($row in $galleryRows) {
  $productIdValue = @($row.product_id)[0]
  if ($null -eq $productIdValue -or [string]::IsNullOrWhiteSpace([string]$productIdValue)) { continue }
  $productsWithGallery[(Get-ScalarInt64 $productIdValue)] = $true
}

foreach ($product in $products) {
  $productId = Get-ScalarInt64 $product.id
  $sourceUrl = [string]$product.image_url
  if ([string]::IsNullOrWhiteSpace($sourceUrl)) { continue }
  if ($productsWithGallery.ContainsKey($productId)) { continue }
  if ($sourceUrl -match "\.webp(\?|$)") {
    $results.Add([pscustomobject]@{
      type = "product"
      product_id = $productId
      product_slug = $product.slug
      status = "skipped"
      reason = "already_webp"
      source_url = $sourceUrl
    })
    continue
  }

  try {
    $convertedPath = Get-WebPFileFromUrl -SourceUrl $sourceUrl -DownloadRoot $downloadRoot -CacheRoot $cacheRoot -BaseName ("{0}-hero" -f $product.slug)
    $storagePath = Get-TargetStoragePath -SourceUrl $sourceUrl -ProductSlug $product.slug -FallbackName ("{0}-hero" -f $product.slug)
    $publicUrl = Upload-ToSupabaseStorage -LocalPath $convertedPath -StoragePath $storagePath

    Update-ProductMainImage -ProductId $productId -NewUrl $publicUrl -OldUrl $sourceUrl | Out-Null

    $results.Add([pscustomobject]@{
      type = "product"
      product_id = $productId
      product_slug = $product.slug
      status = "updated"
      source_url = $sourceUrl
      storage_path = $storagePath
      public_url = $publicUrl
    })
  } catch {
    $results.Add([pscustomobject]@{
      type = "product"
      product_id = $productId
      product_slug = $product.slug
      status = "error"
      source_url = $sourceUrl
      error = $_.Exception.Message
    })
  }
}

$summary = [pscustomobject]@{
  processed_at = (Get-Date).ToString("s")
  total = $results.Count
  updated = @($results | Where-Object status -eq "updated").Count
  skipped = @($results | Where-Object status -eq "skipped").Count
  errors = @($results | Where-Object status -eq "error").Count
  results = $results
}

$summaryPath = Join-Path $outputAbsolute "summary.json"
$summary | ConvertTo-Json -Depth 10 | Set-Content -Path $summaryPath -Encoding UTF8

Write-Host ("WebP migration finished. Updated {0} rows. Summary: {1}" -f $summary.updated, $summaryPath) -ForegroundColor Green
