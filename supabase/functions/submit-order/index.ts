import { createClient } from 'npm:@supabase/supabase-js@2.49.8'
import {
  getInvalidCartQuantity,
  getMaxCartQuantity,
} from '../_shared/cart-quantity.ts'
import {
  buildFulfillmentSnapshot,
  getBusinessProfile,
  notifyOrderEvent,
  recordOrderEvent,
  snapshotStore,
} from '../_shared/order-commerce.ts'
import {
  getZipEnvironment,
  getZipReturnUrl,
  requireZipCheckoutUri,
  zipRequest,
} from '../_shared/zip-payments.ts'
import {
  getPayPalEnvironment,
  getPayPalLink,
  getPayPalReturnUrl,
  paypalRequest,
  requirePayPalApprovalUrl,
} from '../_shared/paypal-payments.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const allowedContactMethods = new Set(['phone', 'email', 'sms'])
const allowedFulfillmentMethods = new Set(['pickup', 'shipping'])
const shippingOptions = new Map([
  ['standard_auspost', { code: 'standard_auspost', label: 'Standard Shipping With Australia Post', deliveryTime: '3-5 business day', rate: 15, freeOver: 399 }],
  ['express_auspost', { code: 'express_auspost', label: 'Express Shipping With Australia Post', deliveryTime: '1-3 business day', rate: 18, freeOver: 599 }],
])
type CartItemInput = {
  product_id?: number | string | null
  slug?: string | null
  qty?: number | string | null
}

function decimal(value: number) {
  return Number(value.toFixed(2))
}

function getShippingOption(code: string) {
  return shippingOptions.get(code) ?? shippingOptions.get('standard_auspost')!
}

function calculateShippingFee(subtotal: number, option: ReturnType<typeof getShippingOption>) {
  if (option.freeOver > 0 && subtotal >= option.freeOver) return 0
  return decimal(option.rate)
}

function buildOrderCode() {
  return `TM8-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get('authorization') ?? ''
  if (!authorization.toLowerCase().startsWith('bearer ')) return ''
  return authorization.slice(7).trim()
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeAustralianMobile(value: string) {
  const digits = value.replace(/\D/g, '')
  if (/^04\d{8}$/.test(digits)) return `+61${digits.slice(1)}`
  if (/^614\d{8}$/.test(digits)) return `+${digits}`
  return ''
}

function absoluteSiteUrl(path: unknown) {
  const siteUrl = String(Deno.env.get('SITE_URL') ?? '').trim().replace(/\/+$/, '')
  if (!siteUrl || !path) return undefined
  try {
    return new URL(String(path), `${siteUrl}/`).toString()
  } catch {
    return undefined
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
    const body = await req.json()

    const customerName = String(body.customer_name ?? '').trim()
    const firstName = String(body.first_name ?? '').trim()
    const lastName = String(body.last_name ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const zipPhone = normalizeAustralianMobile(phone)
    const email = String(body.email ?? '').trim()
    const storeSlug = String(body.store_slug ?? '').trim()
    const preferredContactMethod = String(body.preferred_contact_method ?? 'phone').trim()
    const notes = String(body.notes ?? '').trim()
    const source = String(body.source ?? 'website').trim() || 'website'
    const fulfillmentMethod = String(body.fulfillment_method ?? 'pickup').trim()
    const paymentMethodCode = String(body.payment_method_code ?? 'pay_in_store').trim() || 'pay_in_store'
    const shippingServiceCode = String(body.shipping_service_code ?? 'standard_auspost').trim() || 'standard_auspost'
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
    const billingAddressLine1 = String(body.billing_address_line_1 ?? '').trim()
    const billingAddressLine2 = String(body.billing_address_line_2 ?? '').trim()
    const billingSuburb = String(body.billing_suburb ?? '').trim()
    const billingState = String(body.billing_state ?? '').trim()
    const billingPostcode = String(body.billing_postcode ?? '').trim()
    const billingCountryCode = String(body.billing_country_code ?? 'AU').trim().toUpperCase() || 'AU'
    const metadata = typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {}
    const items = Array.isArray(body.items) ? (body.items as CartItemInput[]) : []

    if (!customerName || !phone || !validEmail(email) || !storeSlug) {
      return Response.json({ ok: false, error: 'Please complete the required checkout fields.' }, { status: 422, headers: corsHeaders })
    }

    if (!allowedContactMethods.has(preferredContactMethod)) {
      return Response.json({ ok: false, error: 'Please choose a valid contact method.' }, { status: 422, headers: corsHeaders })
    }

    if (!allowedFulfillmentMethods.has(fulfillmentMethod)) {
      return Response.json({ ok: false, error: 'Please choose a valid fulfilment method.' }, { status: 422, headers: corsHeaders })
    }

    if (fulfillmentMethod === 'shipping' && paymentMethodCode === 'pay_in_store') {
      return Response.json({ ok: false, error: 'Pay in store is available for physical store pickup only.' }, { status: 422, headers: corsHeaders })
    }

    if (!items.length) {
      return Response.json({ ok: false, error: 'Your cart is empty.' }, { status: 422, headers: corsHeaders })
    }

    if (fulfillmentMethod === 'shipping' && (!addressLine1 || !suburb || !state || !postcode)) {
      return Response.json({ ok: false, error: 'Shipping address is incomplete.' }, { status: 422, headers: corsHeaders })
    }
    if (fulfillmentMethod === 'shipping' && countryCode.toUpperCase() !== 'AU') {
      return Response.json({ ok: false, error: 'Website shipping is currently available within Australia only.' }, { status: 422, headers: corsHeaders })
    }
    const invalidQuantityItem = getInvalidCartQuantity(items)
    if (invalidQuantityItem) {
      const maxQuantity = getMaxCartQuantity(invalidQuantityItem)
      return Response.json({ ok: false, error: `Cart item quantities must be whole numbers between 1 and ${maxQuantity}.` }, { status: 422, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const bearerToken = getBearerToken(req)
    if (!bearerToken) {
      return Response.json({ ok: false, error: 'Please sign in before submitting the order.' }, { status: 401, headers: corsHeaders })
    }
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearerToken)
    const authUser = authData.user ?? null
    if (authError || !authUser?.id) {
      return Response.json({ ok: false, error: 'Your sign-in session is no longer valid.' }, { status: 401, headers: corsHeaders })
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
        .select('id, slug, name, email, phone, address_line_1, address_line_2, suburb, state, postcode, is_active')
        .eq('slug', storeSlug)
        .maybeSingle(),
      supabaseAdmin
        .from('payment_fee_profiles')
        .select('id, code, label, provider, fee_type, percentage, fixed_amount, is_enabled')
        .eq('code', paymentMethodCode)
        .maybeSingle(),
    ])

    if (storeError) {
      return Response.json({ ok: false, error: 'Store configuration could not be loaded.' }, { status: 500, headers: corsHeaders })
    }
    const resolvedStore = store?.is_active ? store : null

    if (!resolvedStore || !resolvedStore.is_active) {
      return Response.json({ ok: false, error: 'Please select a valid store.' }, { status: 422, headers: corsHeaders })
    }
    if (fulfillmentMethod === 'pickup' && (!resolvedStore.email || !resolvedStore.address_line_1 || !resolvedStore.suburb || !resolvedStore.state || !resolvedStore.postcode)) {
      return Response.json({ ok: false, error: 'The selected store contact or pickup address is incomplete.' }, { status: 500, headers: corsHeaders })
    }

    const resolvedFeeProfile = feeProfileError || !feeProfile || !feeProfile.is_enabled
      ? (
          paymentMethodCode === 'pay_in_store'
            ? {
                id: null,
                code: 'pay_in_store',
                label: 'Pay in store',
                provider: 'manual',
                fee_type: 'none',
                percentage: 0,
                fixed_amount: 0,
                is_enabled: true,
              }
            : null
        )
      : feeProfile

    if (!resolvedFeeProfile || !resolvedFeeProfile.is_enabled) {
      return Response.json({ ok: false, error: 'Selected payment method is not available.' }, { status: 422, headers: corsHeaders })
    }
    if (resolvedFeeProfile.code === 'zip') {
      if (resolvedFeeProfile.provider !== 'zip') {
        return Response.json({ ok: false, error: 'Zip payment is not configured as a direct Zip payment method.' }, { status: 500, headers: corsHeaders })
      }
      if (
        resolvedFeeProfile.fee_type !== 'none' ||
        Number(resolvedFeeProfile.percentage || 0) !== 0 ||
        Number(resolvedFeeProfile.fixed_amount || 0) !== 0
      ) {
        return Response.json({ ok: false, error: 'Zip cannot include a customer payment surcharge.' }, { status: 500, headers: corsHeaders })
      }
      if (!firstName || !lastName || !billingAddressLine1 || !billingSuburb || !billingState || !/^\d{4}$/.test(billingPostcode)) {
        return Response.json({ ok: false, error: 'Please complete the Zip billing address.' }, { status: 422, headers: corsHeaders })
      }
      if (billingCountryCode !== 'AU') {
        return Response.json({ ok: false, error: 'Zip billing is currently available for Australian addresses only.' }, { status: 422, headers: corsHeaders })
      }
      if (!zipPhone) {
        return Response.json({ ok: false, error: 'Zip requires a valid Australian mobile number, for example 0412 345 678.' }, { status: 422, headers: corsHeaders })
      }
    }
    if (resolvedFeeProfile.code === 'paypal') {
      if (resolvedFeeProfile.provider !== 'paypal') {
        return Response.json({ ok: false, error: 'PayPal is not configured as a direct PayPal payment method.' }, { status: 500, headers: corsHeaders })
      }
      if (
        resolvedFeeProfile.fee_type !== 'none' ||
        Number(resolvedFeeProfile.percentage || 0) !== 0 ||
        Number(resolvedFeeProfile.fixed_amount || 0) !== 0
      ) {
        return Response.json({ ok: false, error: 'PayPal cannot include a customer payment surcharge.' }, { status: 500, headers: corsHeaders })
      }
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
      return Response.json({ ok: false, error: 'Products could not be validated. One or more cart items are missing from the products table or are not visible.' }, { status: 422, headers: corsHeaders })
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
      const quantity = Number(item.qty)
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
    const shippingOption = fulfillmentMethod === 'shipping' ? getShippingOption(shippingServiceCode) : null
    const shippingFeeAmount = shippingOption ? calculateShippingFee(subtotalAmount, shippingOption) : 0

    const percentage = Number(resolvedFeeProfile.percentage) || 0
    const fixedAmount = Number(resolvedFeeProfile.fixed_amount) || 0
    let paymentFeeAmount = 0

    switch (resolvedFeeProfile.fee_type) {
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
    const business = getBusinessProfile()
    const gstAmount = business.gstRegistered && business.abn ? decimal(totalAmount / 11) : 0
    let issuerStore = resolvedStore
    if (fulfillmentMethod === 'shipping') {
      const { data: parkRidgeStore, error: parkRidgeError } = await supabaseAdmin
        .from('stores')
        .select('id, slug, name, email, phone, address_line_1, address_line_2, suburb, state, postcode, is_active')
        .eq('slug', 'park-ridge')
        .eq('is_active', true)
        .maybeSingle()
      if (parkRidgeError || !parkRidgeStore?.email || !parkRidgeStore.address_line_1 || !parkRidgeStore.suburb || !parkRidgeStore.state || !parkRidgeStore.postcode) {
        return Response.json({ ok: false, error: 'Park Ridge dispatch contact or address is incomplete.' }, { status: 500, headers: corsHeaders })
      }
      issuerStore = parkRidgeStore
    }

    const paymentStatus = resolvedFeeProfile.code === 'pay_in_store' ? 'unpaid' : 'pending'

    const { data: insertedOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_code: orderCode,
        customer_name: customerName,
        phone,
        email,
        auth_user_id: authUser.id,
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
        shipping_provider: shippingOption ? 'Australia Post' : null,
        shipping_service_code: shippingOption?.code ?? null,
        shipping_service_name: shippingOption?.label ?? null,
        total_amount: totalAmount,
        payment_fee_profile_id: resolvedFeeProfile.id,
        payment_method_code: resolvedFeeProfile.code,
        payment_method_label: resolvedFeeProfile.label,
        payment_status: paymentStatus,
        status: 'submitted',
        fulfillment_status: 'new',
        issuer_snapshot: snapshotStore(issuerStore),
        fulfillment_snapshot: buildFulfillmentSnapshot({
          fulfillmentMethod,
          selectedStore: resolvedStore,
          recipientName,
          companyName,
          phone: shippingPhone,
          email: shippingEmail,
          addressLine1,
          addressLine2,
          suburb,
          state,
          postcode,
          countryCode,
        }),
        billing_snapshot: resolvedFeeProfile.code === 'zip'
          ? {
              recipient_name: customerName,
              email,
              phone: zipPhone,
              address_line_1: billingAddressLine1,
              address_line_2: billingAddressLine2 || null,
              suburb: billingSuburb,
              state: billingState,
              postcode: billingPostcode,
              country_code: billingCountryCode,
            }
          : {},
        amount_paid: 0,
        amount_refunded: 0,
        gst_amount: gstAmount,
        source,
        metadata,
      })
      .select('id, order_code, total_amount, payment_fee_amount, shipping_fee_amount, shipping_service_code, shipping_service_name, payment_method_code, payment_method_label')
      .single()

    if (orderError || !insertedOrder) {
      console.error(orderError)
      return Response.json({ ok: false, error: 'Order could not be saved.' }, { status: 500, headers: corsHeaders })
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

    if (resolvedFeeProfile.provider === 'zip' && resolvedFeeProfile.code === 'zip') {
      try {
        const checkout = await zipRequest<{ id?: unknown; uri?: unknown }>('/checkouts', {
          method: 'POST',
          idempotencyKey: `techm8-zip-checkout-${insertedOrder.id}`,
          body: {
            type: 'standard',
            shopper: {
              first_name: firstName,
              last_name: lastName,
              email,
              phone: zipPhone,
              billing_address: {
                first_name: firstName,
                last_name: lastName,
                line1: billingAddressLine1,
                ...(billingAddressLine2 ? { line2: billingAddressLine2 } : {}),
                city: billingSuburb,
                state: billingState,
                postal_code: billingPostcode,
                country: billingCountryCode,
              },
            },
            order: {
              reference: orderCode,
              amount: totalAmount,
              currency: 'AUD',
              items: [
                ...lineItems.map((item) => ({
                  name: item.product_name,
                  amount: decimal(item.unit_price),
                  quantity: item.quantity,
                  type: 'sku',
                  reference: item.sku || item.product_slug,
                  ...(absoluteSiteUrl(`product.html?slug=${encodeURIComponent(item.product_slug)}`)
                    ? { item_uri: absoluteSiteUrl(`product.html?slug=${encodeURIComponent(item.product_slug)}`) }
                    : {}),
                  ...(absoluteSiteUrl(item.image_url) ? { image_uri: absoluteSiteUrl(item.image_url) } : {}),
                })),
                ...(shippingFeeAmount > 0
                  ? [{
                      name: shippingOption?.label || 'Shipping',
                      amount: shippingFeeAmount,
                      quantity: 1,
                      type: 'shipping',
                      reference: shippingOption?.code || 'shipping',
                    }]
                  : []),
              ],
              shipping: fulfillmentMethod === 'shipping'
                ? {
                    pickup: false,
                    address: {
                      first_name: recipientName.split(/\s+/).filter(Boolean)[0] || firstName,
                      last_name: recipientName.split(/\s+/).filter(Boolean).slice(1).join(' ') || lastName,
                      line1: addressLine1,
                      ...(addressLine2 ? { line2: addressLine2 } : {}),
                      city: suburb,
                      state,
                      postal_code: postcode,
                      country: countryCode.toUpperCase(),
                    },
                  }
                : { pickup: true },
            },
            config: {
              redirect_uri: getZipReturnUrl(orderCode),
            },
          },
        })
        const zipCheckoutId = String(checkout.id ?? '').trim()
        const checkoutUrl = requireZipCheckoutUri(checkout.uri)
        if (!zipCheckoutId) throw new Error('Zip did not return a checkout identifier.')

        const { error: zipUpdateError } = await supabaseAdmin
          .from('orders')
          .update({
            zip_checkout_id: zipCheckoutId,
            zip_payment_state: 'created',
            zip_environment: getZipEnvironment(),
          })
          .eq('id', insertedOrder.id)
        if (zipUpdateError) throw zipUpdateError

        await recordOrderEvent(supabaseAdmin, insertedOrder.id, {
          eventKey: `zip_checkout_created:${zipCheckoutId}`,
          eventType: 'payment_started',
          title: 'Zip checkout started',
          description: 'The customer was redirected to Zip to approve payment.',
          actor: { type: 'customer', identifier: authUser.id },
          data: { zip_checkout_id: zipCheckoutId, environment: getZipEnvironment() },
        })

        return Response.json(
          {
            ok: true,
            order_id: insertedOrder.id,
            order_code: insertedOrder.order_code,
            store_name: resolvedStore.name,
            total_amount: insertedOrder.total_amount,
            payment_fee_amount: insertedOrder.payment_fee_amount,
            shipping_fee_amount: insertedOrder.shipping_fee_amount,
            shipping_service_code: insertedOrder.shipping_service_code,
            shipping_service_name: insertedOrder.shipping_service_name,
            shipping_delivery_time: shippingOption?.deliveryTime ?? null,
            payment_method_code: insertedOrder.payment_method_code,
            payment_method_label: insertedOrder.payment_method_label,
            zip_checkout_id: zipCheckoutId,
            checkout_url: checkoutUrl,
          },
          { status: 200, headers: corsHeaders },
        )
      } catch (zipError) {
        console.error('Zip checkout could not be started.', zipError)
        await supabaseAdmin.from('orders').delete().eq('id', insertedOrder.id)
        return Response.json(
          { ok: false, error: 'Zip payment could not be started. Please try again or choose another payment method.' },
          { status: 502, headers: corsHeaders },
        )
      }
    }

    if (resolvedFeeProfile.provider === 'paypal' && resolvedFeeProfile.code === 'paypal') {
      try {
        const paypalOrder = await paypalRequest<Record<string, unknown>>('/v2/checkout/orders', {
          method: 'POST',
          idempotencyKey: `techm8-paypal-order-${insertedOrder.id}`,
          body: {
            intent: 'CAPTURE',
            purchase_units: [{
              reference_id: 'OZ_TECH_M8',
              custom_id: orderCode,
              invoice_id: orderCode,
              description: `OZ TECH M8 order ${orderCode}`,
              amount: {
                currency_code: 'AUD',
                value: totalAmount.toFixed(2),
              },
              ...(fulfillmentMethod === 'shipping'
                ? {
                    shipping: {
                      name: { full_name: recipientName },
                      address: {
                        address_line_1: addressLine1,
                        ...(addressLine2 ? { address_line_2: addressLine2 } : {}),
                        admin_area_2: suburb,
                        admin_area_1: state,
                        postal_code: postcode,
                        country_code: countryCode.toUpperCase(),
                      },
                    },
                  }
                : {}),
            }],
            payment_source: {
              paypal: {
                experience_context: {
                  brand_name: 'OZ TECH M8',
                  locale: 'en-AU',
                  landing_page: 'LOGIN',
                  user_action: 'PAY_NOW',
                  shipping_preference: fulfillmentMethod === 'shipping'
                    ? 'SET_PROVIDED_ADDRESS'
                    : 'NO_SHIPPING',
                  return_url: getPayPalReturnUrl(orderCode),
                  cancel_url: getPayPalReturnUrl(orderCode, true),
                },
              },
            },
          },
        })
        const paypalOrderId = String(paypalOrder.id ?? '').trim()
        const approvalUrl = requirePayPalApprovalUrl(getPayPalLink(paypalOrder, 'payer-action') || getPayPalLink(paypalOrder, 'approve'))
        if (!paypalOrderId) throw new Error('PayPal did not return an order identifier.')

        const { error: paypalUpdateError } = await supabaseAdmin
          .from('orders')
          .update({
            paypal_order_id: paypalOrderId,
            paypal_payment_state: String(paypalOrder.status ?? 'PAYER_ACTION_REQUIRED').trim().toLowerCase(),
            paypal_environment: getPayPalEnvironment(),
          })
          .eq('id', insertedOrder.id)
        if (paypalUpdateError) throw paypalUpdateError

        await recordOrderEvent(supabaseAdmin, insertedOrder.id, {
          eventKey: `paypal_order_created:${paypalOrderId}`,
          eventType: 'payment_started',
          title: 'PayPal checkout started',
          description: 'The customer was redirected to PayPal to approve payment.',
          actor: { type: 'customer', identifier: authUser.id },
          data: { paypal_order_id: paypalOrderId, environment: getPayPalEnvironment() },
        })

        return Response.json(
          {
            ok: true,
            order_id: insertedOrder.id,
            order_code: insertedOrder.order_code,
            store_name: resolvedStore.name,
            total_amount: insertedOrder.total_amount,
            payment_fee_amount: insertedOrder.payment_fee_amount,
            shipping_fee_amount: insertedOrder.shipping_fee_amount,
            shipping_service_code: insertedOrder.shipping_service_code,
            shipping_service_name: insertedOrder.shipping_service_name,
            shipping_delivery_time: shippingOption?.deliveryTime ?? null,
            payment_method_code: insertedOrder.payment_method_code,
            payment_method_label: insertedOrder.payment_method_label,
            paypal_order_id: paypalOrderId,
            checkout_url: approvalUrl,
          },
          { status: 200, headers: corsHeaders },
        )
      } catch (paypalError) {
        console.error('PayPal checkout could not be started.', paypalError)
        await supabaseAdmin.from('orders').delete().eq('id', insertedOrder.id)
        return Response.json(
          { ok: false, error: 'PayPal checkout could not be started. Please try again or choose another payment method.' },
          { status: 502, headers: corsHeaders },
        )
      }
    }

    try {
      await recordOrderEvent(supabaseAdmin, insertedOrder.id, {
        eventKey: 'order_submitted',
        eventType: 'order_submitted',
        title: 'Order submitted',
        description: resolvedFeeProfile.code === 'pay_in_store'
          ? 'The order was submitted with payment due at pickup.'
          : 'The order was submitted for processing.',
        actor: { type: 'customer', identifier: authUser.id },
        data: {
          payment_method_code: resolvedFeeProfile.code,
          fulfillment_method: fulfillmentMethod,
        },
      })
      await notifyOrderEvent(supabaseAdmin, insertedOrder.id, 'order_submitted')
    } catch (notificationError) {
      console.error('Order was saved but confirmation processing failed.', notificationError)
    }

    return Response.json(
      {
        ok: true,
        order_id: insertedOrder.id,
        order_code: insertedOrder.order_code,
        store_name: resolvedStore.name,
        total_amount: insertedOrder.total_amount,
        payment_fee_amount: insertedOrder.payment_fee_amount,
        shipping_fee_amount: insertedOrder.shipping_fee_amount,
        shipping_service_code: insertedOrder.shipping_service_code,
        shipping_service_name: insertedOrder.shipping_service_name,
        shipping_delivery_time: shippingOption?.deliveryTime ?? null,
        payment_method_code: insertedOrder.payment_method_code,
        payment_method_label: insertedOrder.payment_method_label,
      },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: 'Server error while processing the order.' }, { status: 500, headers: corsHeaders })
  }
})
