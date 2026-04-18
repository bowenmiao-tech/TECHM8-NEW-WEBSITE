import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const bucketName = 'product-images'

type GalleryRow = {
  id: number
  product_id: number
  image_url: string
  alt_text: string | null
  sort_order: number
  products: {
    id: number
    sku: string
    slug: string
    name: string
    image_url: string | null
    supplier_image_url: string | null
  } | null
}

function getPublicPrefix(supabaseUrl: string) {
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/`
}

function isSupabaseImage(url: string, supabaseUrl: string) {
  return String(url || '').startsWith(getPublicPrefix(supabaseUrl))
}

function normalizeWixUrl(sourceUrl: string) {
  const decodedUrl = decodeURIComponent(String(sourceUrl || '').trim())
  const match = decodedUrl.match(/https:\/\/static\.wixstatic\.com\/media\/([^/?#]+)(?:\/v1\/.*)?$/i)
  if (!match) return decodedUrl

  const fileName = match[1]
  const extensionMatch = fileName.match(/\.([a-z0-9]+)$/i)
  const extension = extensionMatch?.[1]?.toLowerCase() || 'jpg'

  return `https://static.wixstatic.com/media/${fileName}/v1/fit/w_1400,h_1400,q_90/file.${extension}`
}

function sanitizeSegment(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item'
}

function getFileExtension(contentType: string | null, sourceUrl: string) {
  if (contentType?.includes('png')) return 'png'
  if (contentType?.includes('webp')) return 'webp'
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg'

  const match = String(sourceUrl || '').match(/\.([a-zA-Z0-9]+)(?:$|\?)/)
  return match?.[1]?.toLowerCase() || 'jpg'
}

async function ensureBucket(supabaseAdmin: ReturnType<typeof createClient>) {
  const { error } = await supabaseAdmin.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  })

  if (error && !error.message.toLowerCase().includes('already exists')) {
    throw error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed.' }, { status: 405, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ ok: false, error: 'Missing Supabase service configuration.' }, { status: 500, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    await ensureBucket(supabaseAdmin)

    const { data: galleryRows, error: galleryError } = await supabaseAdmin
      .from('product_images')
      .select(`
        id,
        product_id,
        image_url,
        alt_text,
        sort_order,
        products:products!product_images_product_id_fkey (
          id,
          sku,
          slug,
          name,
          image_url,
          supplier_image_url
        )
      `)
      .order('product_id', { ascending: true })
      .order('sort_order', { ascending: true })

    if (galleryError) {
      console.error(galleryError)
      return Response.json({ ok: false, error: 'Could not read product image rows.' }, { status: 500, headers: corsHeaders })
    }

    const rowsToSync = (galleryRows as GalleryRow[]).filter((row) => {
      return row.products?.slug && row.image_url && !isSupabaseImage(row.image_url, supabaseUrl)
    })

    const results: Array<Record<string, unknown>> = []

    for (const row of rowsToSync) {
      const product = row.products
      if (!product) continue

      const preferredSourceUrl = normalizeWixUrl(row.image_url)
      const fallbackSourceUrl = String(row.image_url)
      let imageResponse = await fetch(preferredSourceUrl)
      let sourceUsed = preferredSourceUrl

      if (!imageResponse.ok && fallbackSourceUrl !== preferredSourceUrl) {
        imageResponse = await fetch(fallbackSourceUrl)
        sourceUsed = fallbackSourceUrl
      }

      if (!imageResponse.ok) {
        results.push({
          sku: product.sku,
          product_slug: product.slug,
          sort_order: row.sort_order,
          ok: false,
          error: `Could not download source image (${imageResponse.status}).`,
          source_url: sourceUsed,
        })
        continue
      }

      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
      const extension = getFileExtension(contentType, sourceUsed)
      const storagePath = `products/${sanitizeSegment(product.slug)}/${String(row.sort_order).padStart(2, '0')}.${extension}`
      const imageBytes = new Uint8Array(await imageResponse.arrayBuffer())

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(storagePath, imageBytes, {
          contentType,
          upsert: true,
        })

      if (uploadError) {
        console.error(uploadError)
        results.push({
          sku: product.sku,
          product_slug: product.slug,
          sort_order: row.sort_order,
          ok: false,
          error: 'Image upload failed.',
          source_url: sourceUsed,
        })
        continue
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(storagePath)
      const publicUrl = publicUrlData.publicUrl

      const { error: imageUpdateError } = await supabaseAdmin
        .from('product_images')
        .update({ image_url: publicUrl })
        .eq('id', row.id)

      if (imageUpdateError) {
        console.error(imageUpdateError)
        results.push({
          sku: product.sku,
          product_slug: product.slug,
          sort_order: row.sort_order,
          ok: false,
          error: 'Gallery image row could not be updated.',
          source_url: sourceUsed,
        })
        continue
      }

      if (row.sort_order === 0) {
        const { error: productUpdateError } = await supabaseAdmin
          .from('products')
          .update({
            image_url: publicUrl,
            supplier_image_url: publicUrl,
          })
          .eq('id', product.id)

        if (productUpdateError) {
          console.error(productUpdateError)
        }
      }

      results.push({
        sku: product.sku,
        product_slug: product.slug,
        sort_order: row.sort_order,
        ok: true,
        source_url: sourceUsed,
        storage_path: storagePath,
        public_url: publicUrl,
      })
    }

    return Response.json(
      {
        ok: true,
        bucket: bucketName,
        synced: results.filter((item) => item.ok === true).length,
        total: rowsToSync.length,
        results,
      },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: 'Server error while syncing product images.' }, { status: 500, headers: corsHeaders })
  }
})
