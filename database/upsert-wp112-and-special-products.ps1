param(
  [string]$SupabaseUrl = $env:SUPABASE_URL,
  [string]$SupabaseServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$ImageRoot = "D:\program\productes photos temple",
  [string]$GeneratedProductsPath = "database\generated\power-bank-import\products.json",
  [string]$StorageBucket = "product-images",
  [string]$OutputRoot = "database\generated\special-product-upsert"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) {
  throw "SUPABASE_URL is required."
}

if ([string]::IsNullOrWhiteSpace($SupabaseServiceRoleKey)) {
  throw "SUPABASE_SERVICE_ROLE_KEY is required."
}

function Invoke-SupabaseRest {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [string]$Prefer = "return=representation"
  )

  $headers = @{
    "apikey"        = $SupabaseServiceRoleKey
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

function Ensure-Array {
  param([object]$Value)

  if ($null -eq $Value) { return @() }
  if ($Value -is [System.Array]) { return @($Value) }
  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    return @($Value)
  }
  return @($Value)
}

function Upload-ToSupabaseStorage {
  param(
    [string]$LocalPath,
    [string]$StoragePath
  )

  $extension = [System.IO.Path]::GetExtension($LocalPath).ToLowerInvariant()
  $contentType = switch ($extension) {
    ".png"  { "image/png" }
    ".webp" { "image/webp" }
    ".jpeg" { "image/jpeg" }
    default { "image/jpeg" }
  }

  $uri = "{0}/storage/v1/object/{1}/{2}" -f $SupabaseUrl.TrimEnd("/"), $StorageBucket, $StoragePath.TrimStart("/")
  $headers = @{
    "apikey"        = $SupabaseServiceRoleKey
    "Authorization" = "Bearer $SupabaseServiceRoleKey"
    "x-upsert"      = "true"
  }

  Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType $contentType -InFile $LocalPath | Out-Null
  return "{0}/storage/v1/object/public/{1}/{2}" -f $SupabaseUrl.TrimEnd("/"), $StorageBucket, $StoragePath.TrimStart("/")
}

function ConvertTo-SafeFileName {
  param(
    [string]$Name,
    [int]$Index
  )

  $extension = [System.IO.Path]::GetExtension($Name).ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($extension)) {
    $extension = ".jpg"
  }

  return ("{0:D2}{1}" -f ($Index + 1), $extension)
}

function Get-OrCreateCategoryId {
  param(
    [string]$Slug,
    [string]$Name,
    [string]$Description = ""
  )

  $escapedSlug = [System.Uri]::EscapeDataString($Slug)
  $existing = @(Ensure-Array (Invoke-SupabaseRest -Method Get -Path ("categories?slug=eq.{0}&select=id,slug" -f $escapedSlug)))
  if ($existing.Count -gt 0) {
    return [int64]$existing[0].id
  }

  $created = Invoke-SupabaseRest -Method Post -Path "categories?select=id,slug" -Body @(
    @{
      slug        = $Slug
      name        = $Name
      description = $Description
      sort_order  = 999
    }
  )
  return [int64]$created[0].id
}

function Get-OrCreateSupplierId {
  param([string]$SupplierName)

  $escapedName = [System.Uri]::EscapeDataString($SupplierName)
  $existing = @(Ensure-Array (Invoke-SupabaseRest -Method Get -Path ("suppliers?name=eq.{0}&select=id,name" -f $escapedName)))
  if ($existing.Count -gt 0) {
    return [int64]$existing[0].id
  }

  $created = Invoke-SupabaseRest -Method Post -Path "suppliers?select=id,name" -Body @(
    @{
      name = $SupplierName
    }
  )
  return [int64]$created[0].id
}

function Upsert-Product {
  param(
    [hashtable]$Product,
    [int64]$CategoryId,
    [int64]$SupplierId
  )

  $body = @(
    @{
      sku                  = $Product.sku
      slug                 = $Product.slug
      name                 = $Product.name
      brand                = $Product.brand
      model                = $Product.model
      upc                  = $Product.upc
      category_id          = $CategoryId
      supplier_id          = $SupplierId
      short_description    = $Product.short_description
      description          = $Product.description
      condition_label      = $Product.condition_label
      compatibility        = $Product.compatibility
      cost_price           = $Product.cost_price
      retail_price         = $Product.retail_price
      compare_at_price     = $Product.compare_at_price
      image_url            = $Product.image_url
      supplier_image_url   = $Product.image_url
      supplier_product_url = $null
      stock_quantity       = $Product.stock_quantity
      min_order_quantity   = 1
      is_featured          = $false
      is_visible           = $true
      seo_title            = $Product.name
      seo_description      = $Product.short_description
    }
  )

  $result = Invoke-SupabaseRest -Method Post -Path "products?on_conflict=sku&select=id,sku,slug,name" -Body $body -Prefer "resolution=merge-duplicates,return=representation"
  return [int64]$result[0].id
}

function Replace-ProductImages {
  param(
    [int64]$ProductId,
    [array]$Images
  )

  Invoke-SupabaseRest -Method Delete -Path ("product_images?product_id=eq.{0}" -f $ProductId) -Prefer "return=minimal" | Out-Null
  if ($Images.Count -eq 0) { return }

  $rows = @()
  foreach ($image in $Images) {
    $rows += @{
      product_id = $ProductId
      image_url  = $image.public_url
      alt_text   = $image.alt_text
      sort_order = $image.sort_order
    }
  }

  Invoke-SupabaseRest -Method Post -Path "product_images?select=id" -Body $rows | Out-Null
}

function Get-StoreIdBySlug {
  param([string]$Slug)
  $escaped = [System.Uri]::EscapeDataString($Slug)
  $result = @(Ensure-Array (Invoke-SupabaseRest -Method Get -Path ("stores?slug=eq.{0}&select=id,slug" -f $escaped)))
  if ($result.Count -gt 0) {
    return [int64]$result[0].id
  }
  return $null
}

function Upsert-InventoryRow {
  param(
    [int64]$ProductId,
    [object]$StoreId,
    [int]$Quantity,
    [string]$ShelfLocation
  )

  if ($null -eq $StoreId -or [string]::IsNullOrWhiteSpace([string]$StoreId)) { return }

  Invoke-SupabaseRest -Method Post -Path "product_store_inventory?on_conflict=product_id,store_id&select=product_id" -Body @(
    @{
      product_id      = $ProductId
      store_id        = [int64]$StoreId
      quantity        = $Quantity
      shelf_location  = $ShelfLocation
    }
  ) -Prefer "resolution=merge-duplicates,return=representation" | Out-Null
}

function Get-LocalWp112Images {
  param([string]$Root)

  $validExtensions = @(".jpg", ".jpeg", ".png", ".webp")
  return @(
    Get-ChildItem -Path $Root -Recurse -File |
      Where-Object {
        $validExtensions -contains $_.Extension.ToLowerInvariant() -and
        $_.FullName -match "WP-?112"
      } |
      Sort-Object FullName
  )
}

$outputAbsolute = Join-Path (Get-Location) $OutputRoot
New-Item -ItemType Directory -Path $outputAbsolute -Force | Out-Null

$generatedProducts = Get-Content -Path $GeneratedProductsPath -Raw | ConvertFrom-Json
$wp112 = @($generatedProducts | Where-Object { $_.model -eq "WP-112" })[0]
if ($null -eq $wp112) {
  throw "WP-112 product definition was not found in $GeneratedProductsPath"
}

$wp112ImageFiles = @(Get-LocalWp112Images -Root $ImageRoot)
if ($wp112ImageFiles.Count -eq 0) {
  throw "No WP-112 image files were found under $ImageRoot"
}

$powerBankCategoryId = Get-OrCreateCategoryId -Slug "power-banks" -Name "Power Banks" -Description "Portable charging devices and magnetic battery packs."
$accessoriesCategoryId = Get-OrCreateCategoryId -Slug "accessories" -Name "Accessories" -Description "Everyday accessories and low-value checkout items."
$wekomeSupplierId = Get-OrCreateSupplierId -SupplierName "WEKOME"
$techm8SupplierId = Get-OrCreateSupplierId -SupplierName "TECHM8"
$warehouseStoreId = Get-StoreIdBySlug -Slug "warehouse-dispatch"

$wp112Product = @{
  sku               = [string]$wp112.sku
  slug              = [string]$wp112.slug
  name              = [string]$wp112.name
  brand             = [string]$wp112.brand
  model             = [string]$wp112.model
  upc               = [string]$wp112.upc
  short_description = [string]$wp112.short_description
  description       = [string]$wp112.description
  condition_label   = [string]$wp112.condition_label
  compatibility     = [string]$wp112.compatibility
  cost_price        = [decimal]$wp112.cost_price
  retail_price      = [decimal]$wp112.retail_price
  compare_at_price  = if ($wp112.compare_at_price) { [decimal]$wp112.compare_at_price } else { $null }
  image_url         = $null
  stock_quantity    = [int]$wp112.stock_quantity
}

$specialProducts = @(
  @{
    sku               = "TM8-ACC-001"
    slug              = "techm8-everyday-accessory"
    name              = "TECHM8 Everyday Accessory"
    brand             = "TECHM8"
    model             = "ACC-001"
    upc               = $null
    short_description = "Compact everyday accessory for phones, tablets and computer setups."
    description       = "Compact everyday accessory for phones, tablets and computer setups."
    condition_label   = "New"
    compatibility     = "Phones, tablets and computers"
    cost_price        = [decimal]0.10
    retail_price      = [decimal]1.00
    compare_at_price  = [decimal]2.00
    image_url         = $null
    stock_quantity    = 999
  },
  @{
    sku               = "TM8-ACC-010"
    slug              = "techm8-charging-essential-pack"
    name              = "TECHM8 Charging Essential Pack"
    brand             = "TECHM8"
    model             = "ACC-010"
    upc               = $null
    short_description = "Useful charging add-on item for mobile and computer accessory orders."
    description       = "Useful charging add-on item for mobile and computer accessory orders."
    condition_label   = "New"
    compatibility     = "Phones, tablets and computers"
    cost_price        = [decimal]2.00
    retail_price      = [decimal]10.00
    compare_at_price  = [decimal]14.95
    image_url         = $null
    stock_quantity    = 999
  }
)

$summary = New-Object System.Collections.Generic.List[object]

$wp112ProductId = Upsert-Product -Product $wp112Product -CategoryId $powerBankCategoryId -SupplierId $wekomeSupplierId
$uploadedWp112Images = @()
$sortOrder = 0
foreach ($file in $wp112ImageFiles) {
  $safeFileName = ConvertTo-SafeFileName -Name $file.Name -Index $sortOrder
  $storagePath = "products/power-banks/{0}/{1}" -f $wp112Product.slug, $safeFileName
  $publicUrl = Upload-ToSupabaseStorage -LocalPath $file.FullName -StoragePath $storagePath
  $uploadedWp112Images += [pscustomobject]@{
    public_url  = $publicUrl
    alt_text    = $wp112Product.name
    sort_order  = $sortOrder
  }
  $sortOrder++
}

Replace-ProductImages -ProductId $wp112ProductId -Images $uploadedWp112Images
Invoke-SupabaseRest -Method Patch -Path ("products?id=eq.{0}" -f $wp112ProductId) -Body @{
  image_url          = $uploadedWp112Images[0].public_url
  supplier_image_url = $uploadedWp112Images[0].public_url
} -Prefer "return=minimal" | Out-Null
Upsert-InventoryRow -ProductId $wp112ProductId -StoreId $warehouseStoreId -Quantity $wp112Product.stock_quantity -ShelfLocation "ONLINE"

$summary.Add([pscustomobject]@{
  sku          = $wp112Product.sku
  slug         = $wp112Product.slug
  action       = "upserted_with_images"
  image_count  = $uploadedWp112Images.Count
})

foreach ($product in $specialProducts) {
  $productId = Upsert-Product -Product $product -CategoryId $accessoriesCategoryId -SupplierId $techm8SupplierId
  Upsert-InventoryRow -ProductId $productId -StoreId $warehouseStoreId -Quantity $product.stock_quantity -ShelfLocation "ONLINE"
  $summary.Add([pscustomobject]@{
    sku          = $product.sku
    slug         = $product.slug
    action       = "upserted"
    image_count  = 0
  })
}

$summaryPath = Join-Path $outputAbsolute "summary.json"
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $summaryPath -Encoding UTF8
Write-Host ("Upsert complete. Summary written to {0}" -f $summaryPath)
