import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@16'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const allowedContactMethods = new Set(['phone', 'email', 'sms'])
const allowedFulfillmentMethods = new Set(['pickup', 'shipping'])
const allowedStripePaymentMethods = new Map<string, Stripe.Checkout.SessionCreateParams.PaymentMethodType[]>([
  ['card', ['card']],
  ['afterpay_clearpay', ['afterpay_clearpay']],
  ['wechat_pay', ['wechat_pay']],
])
const fallbackStores = new Map([
  ['park-ridge', { slug: 'park-ridge', name: 'Park Ridge', is_active: true, id: null }],
  ['fairfield', { slug: 'fairfield', name: 'Fairfield', is_active: true, id: null }],
  ['toowong', { slug: 'toowong', name: 'Toowong', is_active: true, id: null }],
  ['north-lakes', { slug: 'north-lakes', name: 'North Lakes', is_active: true, id: null }],
  ['brassall', { slug: 'brassall', name: 'Brassall', is_active: true, id: null }],
  ['warehouse-dispatch', { slug: 'warehouse-dispatch', name: 'Warehouse Dispatch', is_active: true, id: null }],
])

type CartItemInput = {
  slug?: string | null
  qty?: number | string | null
}

function decimal(value: number) {
  return Number(value.toFixed(2))
}

function moneyToCents(value: number) {
  return Math.max(0, Math.round(value * 100))
}

function buildOrderCode() {
  return `TM8-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/, '')
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get('authorization') ?? ''
  if (!authorization.toLowerCase().startsWith('bearer ')) return ''
  return authorization.slice(7).trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed.' }, { status: 405, headers: corsHeaders })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  if (!stripeSecretKey) {
    return Response.json({ ok: false, error: 'Stripe secret key is not configured.' }, { status: 500, headers: corsHeaders })
  }

  try {
    const body = await req.json()

    const customerName = String(body.customer_name ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const email = String(body.email ?? '').trim()
    const storeSlug = String(body.store_slug ?? '').trim()
    const preferredContactMethod = String(body.preferred_contact_method ?? 'phone').trim()
    const notes = String(body.notes ?? '').trim()
    const source = String(body.source ?? 'website').trim() || 'website'
    const siteUrl = normalizeSiteUrl(String(Deno.env.get('SITE_URL') ?? body.site_url ?? '').trim())
    const fulfillmentMethod = String(body.fulfillment_method ?? 'pickup').trim()
    const paymentMethodCode = String(body.payment_method_code ?? 'card').trim()
    const recipientName = String(body.recipient_name ?? customerName).trim()
    const companyName = String(body.company_name ?? '').trim()
    const shippingPhone = String(body.shipping_phone ?? phone).trim()
    const shippingEmail = String(body.shipping_email ?? email).trim()
    const addressLine1 = String(body.address_line_1 ?? '').trim()
    const addressLine2 = String(body.address_line_2 ?? '').trim()
    const suburb = String(body.suburb ?? '').trim()
    const state = String(body.state ?? '').trim()
    const postcode = String(body.postcode ?? '').trim()
    const countryCode = String(body.country_code ?? 'AU').trim() || 'AU'
    const metadata = typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {}
    const items = Array.isArray(body.items) ? (body.items as CartItemInput[]) : []

    if (!siteUrl) {
      return Response.json({ ok: false, error: 'Site URL is missing.' }, { status: 422, headers: corsHeaders })
    }

    if (!customerName || !phone || !email || !storeSlug) {
      return Response.json({ ok: false, error: 'Please complete the required checkout fields.' }, { status: 422, headers: corsHeaders })
    }

    if (!allowedContactMethods.has(preferredContactMethod)) {
      return Response.json({ ok: false, error: 'Please choose a valid contact method.' }, { status: 422, headers: corsHeaders })
    }

    if (!allowedFulfillmentMethods.has(fulfillmentMethod)) {
      return Response.json({ ok: false, error: 'Please choose a valid fulfilment method.' }, { status: 422, headers: corsHeaders })
    }

    if (!allowedStripePaymentMethods.has(paymentMethodCode)) {
      return Response.json({ ok: false, error: 'Selected payment method cannot open Stripe Checkout.' }, { status: 422, headers: corsHeaders })
    }

    if (!items.length) {
      return Response.json({ ok: false, error: 'Your cart is empty.' }, { status: 422, headers: corsHeaders })
    }

    if (fulfillmentMethod === 'shipping' && (!addressLine1 || !suburb || !state || !postcode)) {
      return Response.json({ ok: false, error: 'Shipping address is incomplete.' }, { status: 422, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const bearerToken = getBearerToken(req)
    let authUser: Awaited<ReturnType<typeof supabaseAdmin.auth.getUser>>['data']['user'] = null
    if (bearerToken) {
      const { data } = await supabaseAdmin.auth.getUser(bearerToken)
      authUser = data.user ?? null
    }

    if (authUser?.id) {
      await supabaseAdmin.from('profiles').upsert(
        {
          id: authUser.id,
          email: authUser.email ?? email,
          full_name: customerName || authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
          phone: phone || authUser.user_metadata?.phone || null,
          default_store_slug: storeSlug || null,
          avatar_url: authUser.user_metadata?.avatar_url ?? null,
          provider: authUser.app_metadata?.provider ?? null,
        },
        { onConflict: 'id' }
      )
    }

    const [{ data: store, error: storeError }, { data: feeProfile, error: feeProfileError }] = await Promise.all([
      supabaseAdmin
        .from('stores')
        .select('id, slug, name, is_active')
        .eq('slug', storeSlug)
        .maybeSingle(),
      supabaseAdmin
        .from('payment_fee_profiles')
        .select('id, code, label, provider, fee_type, percentage, fixed_amount, is_enabled')
        .eq('code', paymentMethodCode)
        .maybeSingle(),
    ])

    const resolvedStore = store && !storeError && store.is_active
      ? store
      : fallbackStores.get(storeSlug) ?? null

    if (!resolvedStore || !resolvedStore.is_active) {
      return Response.json({ ok: false, error: 'Please select a valid store.' }, { status: 422, headers: corsHeaders })
    }

    if (feeProfileError || !feeProfile || !feeProfile.is_enabled || feeProfile.provider !== 'stripe') {
      return Response.json({ ok: false, error: 'Selected payment method is not available for online payment.' }, { status: 422, headers: corsHeaders })
    }

    const requestedSlugs = items
      .map((item) => String(item.slug ?? '').trim())
      .filter(Boolean)

    if (!requestedSlugs.length) {
      return Response.json({ ok: false, error: 'Cart items are invalid.' }, { status: 422, headers: corsHeaders })
    }

    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, sku, slug, name, brand, compatibility, retail_price, compare_at_price, image_url, category_id')
      .in('slug', requestedSlugs)
      .eq('is_visible', true)

    if (productsError || !products?.length) {
      return Response.json({ ok: false, error: 'Products could not be validated.' }, { status: 422, headers: corsHeaders })
    }

    const productsBySlug = new Map(products.map((product) => [product.slug, product]))
    const missing = requestedSlugs.filter((slug) => !productsBySlug.has(slug))
    if (missing.length) {
      return Response.json({ ok: false, error: 'Some cart items are no longer available.' }, { status: 422, headers: corsHeaders })
    }

    const categoryIds = Array.from(new Set(products.map((product) => product.category_id).filter(Boolean)))
    const { data: categories } = categoryIds.length
      ? await supabaseAdmin
          .from('categories')
          .select('id, name')
          .in('id', categoryIds)
      : { data: [] as Array<{ id: number; name: string }> }
    const categoriesById = new Map((categories ?? []).map((category) => [category.id, category.name]))

    const lineItems = items.map((item) => {
      const slug = String(item.slug ?? '').trim()
      const product = productsBySlug.get(slug)!
      const quantity = Math.max(1, Number(item.qty) || 1)
      const unitPrice = Number(product.retail_price) || 0
      const compareAtPrice = Number(product.compare_at_price) || null
      const lineTotal = decimal(unitPrice * quantity)

      return {
        product_id: product.id,
        sku: product.sku,
        product_slug: product.slug,
        product_name: product.name,
        brand: product.brand,
        category_name: product.category_id ? categoriesById.get(product.category_id) ?? null : null,
        compatibility: product.compatibility,
        image_url: product.image_url,
        quantity,
        unit_price: unitPrice,
        compare_at_price: compareAtPrice,
        line_total: lineTotal,
        product_snapshot: {
          id: product.id,
          sku: product.sku,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          category_name: product.category_id ? categoriesById.get(product.category_id) ?? null : null,
          compatibility: product.compatibility,
          image_url: product.image_url,
        },
      }
    })

    const subtotalAmount = decimal(lineItems.reduce((sum, item) => sum + item.line_total, 0))
    const discountAmount = 0
    const shippingFeeAmount = 0
    const percentage = Number(feeProfile.percentage) || 0
    const fixedAmount = Number(feeProfile.fixed_amount) || 0

    let paymentFeeAmount = 0
    switch (feeProfile.fee_type) {
      case 'fixed':
        paymentFeeAmount = fixedAmount
        break
      case 'percent':
        paymentFeeAmount = subtotalAmount * (percentage / 100)
        break
      case 'combined':
        paymentFeeAmount = subtotalAmount * (percentage / 100) + fixedAmount
        break
      default:
        paymentFeeAmount = 0
    }

    paymentFeeAmount = decimal(paymentFeeAmount)
    const totalAmount = decimal(subtotalAmount - discountAmount + paymentFeeAmount + shippingFeeAmount)
    const orderCode = buildOrderCode()

    const { data: insertedOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_code: orderCode,
        customer_name: customerName,
        phone,
        email,
        auth_user_id: authUser?.id ?? null,
        preferred_contact_method: preferredContactMethod,
        store_id: resolvedStore.id,
        store_slug: resolvedStore.slug,
        fulfillment_method: fulfillmentMethod,
        recipient_name: fulfillmentMethod === 'shipping' ? recipientName : null,
        company_name: fulfillmentMethod === 'shipping' ? companyName || null : null,
        shipping_phone: fulfillmentMethod === 'shipping' ? shippingPhone || null : null,
        shipping_email: fulfillmentMethod === 'shipping' ? shippingEmail || null : null,
        address_line_1: fulfillmentMethod === 'shipping' ? addressLine1 || null : null,
        address_line_2: fulfillmentMethod === 'shipping' ? addressLine2 || null : null,
        suburb: fulfillmentMethod === 'shipping' ? suburb || null : null,
        state: fulfillmentMethod === 'shipping' ? state || null : null,
        postcode: fulfillmentMethod === 'shipping' ? postcode || null : null,
        country_code: fulfillmentMethod === 'shipping' ? countryCode : 'AU',
        notes: notes || null,
        subtotal_amount: subtotalAmount,
        discount_amount: discountAmount,
        payment_fee_amount: paymentFeeAmount,
        shipping_fee_amount: shippingFeeAmount,
        total_amount: totalAmount,
        payment_fee_profile_id: feeProfile.id,
        payment_method_code: feeProfile.code,
        payment_method_label: feeProfile.label,
        payment_status: 'pending',
        status: 'submitted',
        fulfillment_status: 'new',
        source,
        metadata,
      })
      .select('id, order_code')
      .single()

    if (orderError || !insertedOrder) {
      console.error(orderError)
      return Response.json({ ok: false, error: 'Order could not be saved before payment.' }, { status: 500, headers: corsHeaders })
    }

    const { error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .insert(
        lineItems.map((item) => ({
          order_id: insertedOrder.id,
          ...item,
        }))
      )

    if (orderItemsError) {
      console.error(orderItemsError)
      await supabaseAdmin.from('orders').delete().eq('id', insertedOrder.id)
      return Response.json({ ok: false, error: 'Order items could not be saved.' }, { status: 500, headers: corsHeaders })
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })

    try {
      const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lineItems.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'aud',
          unit_amount: moneyToCents(item.unit_price),
          product_data: {
            name: item.product_name,
            metadata: {
              sku: item.sku ?? '',
              slug: item.product_slug ?? '',
              brand: item.brand ?? '',
            },
            images: item.image_url ? [item.image_url] : undefined,
          },
        },
      }))

      if (paymentFeeAmount > 0) {
        stripeLineItems.push({
          quantity: 1,
          price_data: {
            currency: 'aud',
            unit_amount: moneyToCents(paymentFeeAmount),
            product_data: {
              name: `${feeProfile.label} processing fee`,
            },
          },
        })
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: allowedStripePaymentMethods.get(paymentMethodCode)!,
        customer_email: email,
        client_reference_id: orderCode,
        phone_number_collection: { enabled: true },
        success_url: `${siteUrl}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}&order_code=${encodeURIComponent(orderCode)}`,
        cancel_url: `${siteUrl}/checkout.html?payment=cancelled&order_code=${encodeURIComponent(orderCode)}`,
        metadata: {
          order_id: String(insertedOrder.id),
          order_code: orderCode,
          store_slug: resolvedStore.slug,
          payment_method_code: feeProfile.code,
        },
        payment_intent_data: {
          metadata: {
            order_id: String(insertedOrder.id),
            order_code: orderCode,
            store_slug: resolvedStore.slug,
            payment_method_code: feeProfile.code,
          },
        },
        line_items: stripeLineItems,
      })

      const { error: updateOrderError } = await supabaseAdmin
        .from('orders')
        .update({
          stripe_checkout_session_id: session.id,
        })
        .eq('id', insertedOrder.id)

      if (updateOrderError) {
        console.error(updateOrderError)
        throw new Error('Order was created but Stripe session could not be linked.')
      }

      return Response.json(
        {
          ok: true,
          order_id: insertedOrder.id,
          order_code: orderCode,
          checkout_url: session.url,
          session_id: session.id,
        },
        { status: 200, headers: corsHeaders }
      )
    } catch (stripeError) {
      console.error(stripeError)
      await supabaseAdmin.from('orders').delete().eq('id', insertedOrder.id)
      return Response.json({ ok: false, error: 'Stripe Checkout session could not be created.' }, { status: 500, headers: corsHeaders })
    }
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: 'Server error while preparing Stripe checkout.' }, { status: 500, headers: corsHeaders })
  }
})
