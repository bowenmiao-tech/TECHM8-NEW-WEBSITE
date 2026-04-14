import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const bucketName = 'product-images'

const controllerImages = [
  {
    sku: 'TM8-PS5-DS-STERLING-SILVER',
    slug: 'dualsense-wireless-controller-sterling-silver-playstation-5',
    sourceImageUrl:
      'https://static.wixstatic.com/media/ff60a8_44b8629acec14e089b265c9c134f3dcd~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
  },
  {
    sku: 'TM8-PS5-DS-COSMIC-RED',
    slug: 'dualsense-wireless-controller-cosmic-red-playstation-5',
    sourceImageUrl:
      'https://static.wixstatic.com/media/ff60a8_3d6c59b7f9844dce9cddba30391438aa~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
  },
  {
    sku: 'TM8-PS5-DS-GRAY-CAMO',
    slug: 'dualsense-wireless-controller-gray-camouflage',
    sourceImageUrl:
      'https://static.wixstatic.com/media/ff60a8_e970ca83b1cb486aaae98a2172e07cbc~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
  },
  {
    sku: 'TM8-PS5-DS-BLACK',
    slug: 'copy-of-dualsense-wireless-controller-playstation-5-black',
    sourceImageUrl:
      'https://static.wixstatic.com/media/ff60a8_8b5310c0258a420ea7f0e18e943a501d~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
  },
  {
    sku: 'TM8-PS5-DS-WHITE',
    slug: 'dualsense-wireless-controller-playstation-5-white',
    sourceImageUrl:
      'https://static.wixstatic.com/media/ff60a8_997f0a93bc8e4b9a907efb21027b37f0~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg',
  },
]

function getFileExtension(contentType: string | null, sourceUrl: string) {
  if (contentType?.includes('png')) return 'png'
  if (contentType?.includes('webp')) return 'webp'
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg'

  const match = sourceUrl.match(/\.([a-zA-Z0-9]+)(?:$|\?)/)
  return match?.[1]?.toLowerCase() || 'jpg'
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

    const { error: bucketError } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    })

    if (bucketError && !bucketError.message.toLowerCase().includes('already exists')) {
      console.error(bucketError)
      return Response.json({ ok: false, error: 'Could not create or access the product image bucket.' }, { status: 500, headers: corsHeaders })
    }

    const results: Array<Record<string, unknown>> = []

    for (const item of controllerImages) {
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, sku, name')
        .eq('sku', item.sku)
        .maybeSingle()

      if (productError || !product) {
        results.push({
          sku: item.sku,
          ok: false,
          error: 'Product row not found. Run the product seed first.',
        })
        continue
      }

      const imageResponse = await fetch(item.sourceImageUrl)
      if (!imageResponse.ok) {
        results.push({
          sku: item.sku,
          ok: false,
          error: `Could not download source image (${imageResponse.status}).`,
        })
        continue
      }

      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
      const extension = getFileExtension(contentType, item.sourceImageUrl)
      const storagePath = `products/controllers/${item.slug}.${extension}`
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
          sku: item.sku,
          ok: false,
          error: 'Image upload failed.',
        })
        continue
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(storagePath)
      const publicUrl = publicUrlData.publicUrl

      const { error: updateProductError } = await supabaseAdmin
        .from('products')
        .update({
          image_url: publicUrl,
        })
        .eq('id', product.id)

      if (updateProductError) {
        console.error(updateProductError)
        results.push({
          sku: item.sku,
          ok: false,
          error: 'Product image URL could not be updated.',
        })
        continue
      }

      const { error: deleteImagesError } = await supabaseAdmin
        .from('product_images')
        .delete()
        .eq('product_id', product.id)

      if (deleteImagesError) {
        console.error(deleteImagesError)
      }

      const { error: insertImageError } = await supabaseAdmin
        .from('product_images')
        .insert({
          product_id: product.id,
          image_url: publicUrl,
          alt_text: product.name,
          sort_order: 0,
        })

      if (insertImageError) {
        console.error(insertImageError)
        results.push({
          sku: item.sku,
          ok: false,
          error: 'Stored product image row could not be recreated.',
        })
        continue
      }

      results.push({
        sku: item.sku,
        ok: true,
        storage_path: storagePath,
        public_url: publicUrl,
      })
    }

    const successCount = results.filter((item) => item.ok === true).length

    return Response.json(
      {
        ok: true,
        bucket: bucketName,
        synced: successCount,
        total: controllerImages.length,
        results,
      },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: 'Server error while syncing product images.' }, { status: 500, headers: corsHeaders })
  }
})
