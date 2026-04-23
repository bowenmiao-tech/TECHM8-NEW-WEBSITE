param(
  [string]$ImageRoot = "D:\program\productes photos temple",
  [string]$SupabaseUrl = $env:SUPABASE_URL,
  [string]$SupabaseServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$StorageBucket = "product-images",
  [string]$OutputRoot = "database\generated\missing-product-images",
  [switch]$UploadToSupabase,
  [switch]$ForceReplaceExisting
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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

function Get-ModelTokens {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return @()
  }

  $matches = [regex]::Matches($Text.ToUpperInvariant(), "(RPP-\d+|FCP-\d+|WP-\d+)")
  return @($matches | ForEach-Object { $_.Value } | Select-Object -Unique)
}

function Get-ProductCapacityHints {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return @()
  }

  $matches = [regex]::Matches($Text, "\b(5000|10000|20000|30000|100000)\b")
  return @($matches | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
}

function Get-ProductColorHints {
  param([string]$Text)

  $hints = New-Object System.Collections.Generic.List[string]
  $value = [string]$Text
  if ([string]::IsNullOrWhiteSpace($value)) {
    return @()
  }

  $lower = $value.ToLowerInvariant()
  $colors = @("black", "white", "pink", "blue", "green", "purple", "red", "silver", "grey", "gray", "gold")

  foreach ($color in $colors) {
    if ($lower -match [regex]::Escape($color)) {
      $hints.Add($color)
    }
  }

  return @($hints | Select-Object -Unique)
}

function Get-ImageCandidates {
  param([string]$Root)

  $validExtensions = @(".jpg", ".jpeg", ".png", ".webp")
  $files = Get-ChildItem -Path $Root -Recurse -File | Where-Object { $validExtensions -contains $_.Extension.ToLowerInvariant() }
  return @($files)
}

function Get-HeroPenalty {
  param([string]$RelativePath)

  $lower = [string]$RelativePath
  $lower = $lower.ToLowerInvariant()
  $penalty = 0

  if ($lower -match "package|packing|box|wechat|description|feature|english|translation") { $penalty += 40 }
  if ($lower -match "group|combo|all|set") { $penalty += 25 }
  if ($lower -match "official") { $penalty -= 10 }

  return $penalty
}

function Get-ImageScore {
  param(
    [pscustomobject]$Product,
    [System.IO.FileInfo]$File,
    [string]$Root
  )

  $productText = ("{0} {1} {2}" -f $Product.name, $Product.model, $Product.sku).ToLowerInvariant()
  $relativePath = $File.FullName.Substring($Root.Length).TrimStart("\")
  $relativeLower = $relativePath.ToLowerInvariant()
  $score = 100

  $modelToken = [string]$Product.model
  if (-not [string]::IsNullOrWhiteSpace($modelToken)) {
    $modelLower = $modelToken.ToLowerInvariant()
    if ($relativeLower -match [regex]::Escape($modelLower)) {
      $score -= 45
    }
  }

  $capacityHints = Get-ProductCapacityHints -Text $productText
  foreach ($capacity in $capacityHints) {
    if ($relativeLower -match [regex]::Escape($capacity)) {
      $score -= 20
    }
  }

  $colorHints = Get-ProductColorHints -Text $productText
  $knownColorWords = @("black", "white", "pink", "blue", "green", "purple", "red", "silver", "grey", "gray", "gold")
  foreach ($color in $colorHints) {
    if ($relativeLower -match [regex]::Escape($color)) {
      $score -= 15
    }
  }

  $hasForeignColor = $false
  foreach ($knownColor in $knownColorWords) {
    if (($relativeLower -match [regex]::Escape($knownColor)) -and ($colorHints -notcontains $knownColor)) {
      $hasForeignColor = $true
    }
  }
  if ($hasForeignColor) {
    $score += 20
  }

  $score += Get-HeroPenalty -RelativePath $relativePath
  $score += [Math]::Min(($relativePath.Split("\").Count - 1) * 2, 12)
  return $score
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

  $json = $Body | ConvertTo-Json -Depth 10 -Compress
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $json
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

function Replace-ProductImages {
  param(
    [int64]$ProductId,
    [array]$Images
  )

  Invoke-SupabaseRest -Method Delete -Path ("product_images?product_id=eq.{0}" -f $ProductId) -Prefer "return=minimal" | Out-Null

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

function Get-ProductRowsForToken {
  param([string]$Token)

  $escaped = [System.Uri]::EscapeDataString("*$Token*")
  $query = ('products?select=id,sku,slug,name,model,image_url,is_visible&or=(model.ilike.{0},sku.ilike.{0},name.ilike.{0})' -f $escaped)
  $result = Invoke-SupabaseRest -Method Get -Path $query
  return @($result | Where-Object { $_.is_visible -ne $false })
}

function Get-ExistingGalleryRows {
  param([int64]$ProductId)

  $query = ('product_images?product_id=eq.{0}&select=id,image_url,sort_order' -f $ProductId)
  $result = Invoke-SupabaseRest -Method Get -Path $query
  return @($result)
}

function Test-ProductNeedsImages {
  param([pscustomobject]$Product)

  if ($ForceReplaceExisting) {
    return $true
  }

  $imageUrl = [string]$Product.image_url
  if (-not [string]::IsNullOrWhiteSpace($imageUrl) -and $imageUrl -notmatch "coming-soon|placeholder|no-image") {
    $galleryRows = Get-ExistingGalleryRows -ProductId ([int64]$Product.id)
    if ($galleryRows.Count -gt 0) {
      return $false
    }
  }

  return $true
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

$outputAbsolute = Join-Path (Get-Location) $OutputRoot
New-Item -ItemType Directory -Path $outputAbsolute -Force | Out-Null

$topLevelFolders = @(Get-ChildItem -Path $ImageRoot -Directory)
$summaryRows = New-Object System.Collections.Generic.List[object]

foreach ($folder in $topLevelFolders) {
  $tokens = @(Get-ModelTokens -Text $folder.Name)
  if ($tokens.Count -eq 0) {
    $summaryRows.Add([pscustomobject]@{
      source_folder = $folder.FullName
      model_token = ""
      product_slug = ""
      status = "skipped"
      reason = "No model token found in folder name."
      image_count = 0
    })
    continue
  }

  $imageCandidates = @(Get-ImageCandidates -Root $folder.FullName)
  if ($imageCandidates.Count -eq 0) {
    foreach ($token in $tokens) {
      $summaryRows.Add([pscustomobject]@{
        source_folder = $folder.FullName
        model_token = $token
        product_slug = ""
        status = "skipped"
        reason = "No supported image files found."
        image_count = 0
      })
    }
    continue
  }

  foreach ($token in $tokens) {
    $products = @()
    if ($UploadToSupabase) {
      $products = @(Get-ProductRowsForToken -Token $token)
    }

    if ($products.Count -eq 0) {
      $summaryRows.Add([pscustomobject]@{
        source_folder = $folder.FullName
        model_token = $token
        product_slug = ""
        status = if ($UploadToSupabase) { "missing-product" } else { "preview" }
        reason = if ($UploadToSupabase) { "No visible product matched this token in Supabase." } else { "Preview only." }
        image_count = $imageCandidates.Count
      })
      continue
    }

    foreach ($product in $products) {
      $needsImages = $true
      if ($UploadToSupabase) {
        $needsImages = Test-ProductNeedsImages -Product $product
      }

      if (-not $needsImages) {
        $summaryRows.Add([pscustomobject]@{
          source_folder = $folder.FullName
          model_token = $token
          product_slug = $product.slug
          status = "skipped"
          reason = "Product already has images."
          image_count = 0
        })
        continue
      }

      $orderedImages = @(
        $imageCandidates |
        Sort-Object @(
          @{ Expression = { Get-ImageScore -Product $product -File $_ -Root $folder.FullName } },
          @{ Expression = { $_.Name } }
        )
      )

      $previewImages = @()
      $sortOrder = 0
      foreach ($file in $orderedImages) {
        $sortOrder++
        $previewImages += [pscustomobject]@{
          local_path = $file.FullName
          file_name = $file.Name
          sort_order = $sortOrder
          alt_text = [string]$product.name
        }
      }

      if (-not $UploadToSupabase) {
        $summaryRows.Add([pscustomobject]@{
          source_folder = $folder.FullName
          model_token = $token
          product_slug = $product.slug
          status = "preview"
          reason = "Ready to upload."
          image_count = $previewImages.Count
          primary_image = if ($previewImages.Count -gt 0) { $previewImages[0].file_name } else { "" }
        })
        continue
      }

      $uploadedImages = @()
      foreach ($image in $previewImages) {
        $baseName = ConvertTo-Slug ([System.IO.Path]::GetFileNameWithoutExtension($image.file_name))
        if ([string]::IsNullOrWhiteSpace($baseName)) {
          $baseName = "image"
        }
        $safeFileName = "{0:D2}-{1}{2}" -f $image.sort_order, $baseName, ([System.IO.Path]::GetExtension($image.file_name).ToLowerInvariant())
        $storagePath = "products/missing-catalog-images/{0}/{1}" -f $product.slug, $safeFileName
        $publicUrl = Upload-ToSupabaseStorage -LocalPath $image.local_path -StoragePath $storagePath
        $uploadedImages += [pscustomobject]@{
          public_url = $publicUrl
          alt_text = $image.alt_text
          sort_order = $image.sort_order
        }
      }

      if ($uploadedImages.Count -gt 0) {
        Replace-ProductImages -ProductId ([int64]$product.id) -Images $uploadedImages
        Invoke-SupabaseRest -Method Patch -Path ("products?id=eq.{0}" -f $product.id) -Body @{
          image_url = $uploadedImages[0].public_url
          supplier_image_url = $uploadedImages[0].public_url
        } -Prefer "return=minimal" | Out-Null
      }

      $summaryRows.Add([pscustomobject]@{
        source_folder = $folder.FullName
        model_token = $token
        product_slug = $product.slug
        status = "uploaded"
        reason = ""
        image_count = $uploadedImages.Count
        primary_image = if ($uploadedImages.Count -gt 0) { $uploadedImages[0].public_url } else { "" }
      })
    }
  }
}

$summaryPath = Join-Path $outputAbsolute "summary.json"
$summaryRows | ConvertTo-Json -Depth 8 | Set-Content -Path $summaryPath -Encoding UTF8

if ($UploadToSupabase) {
  $uploadedCount = @($summaryRows | Where-Object { $_.status -eq "uploaded" }).Count
  Write-Host ("Upload complete. Updated {0} product rows." -f $uploadedCount)
} else {
  Write-Host "Preview complete. No data uploaded."
  Write-Host ("Summary written to: {0}" -f $summaryPath)
}
