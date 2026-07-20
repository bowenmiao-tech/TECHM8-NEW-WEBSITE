import { createClient } from 'npm:@supabase/supabase-js@2.49.8'
import { finalizePaidOrder, recordOrderEvent } from '../_shared/order-commerce.ts'
import {
  getPayPalCapture,
  isTransientPayPalError,
  paypalRequest,
  type PayPalJson,
} from '../_shared/paypal-payments.ts'

function text(value: unknown) {
  return String(value ?? '').trim()
}

function money(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0
}

function object(value: unknown): PayPalJson {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as PayPalJson : {}
}

function firstPurchaseUnit(payload: PayPalJson) {
  return Array.isArray(payload.purchase_units) && payload.purchase_units[0]
    ? object(payload.purchase_units[0])
    : {}
}

function getSiteUrl() {
  const configured = text(Deno.env.get('SITE_URL')).replace(/\/+$/, '')
  if (!configured) throw new Error('SITE_URL is not configured.')
  const url = new URL(configured)
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('SITE_URL is invalid.')
  return url
}

function siteRedirect(path: string, params: Record<string, string>) {
  const target = new URL(path, `${getSiteUrl().toString().replace(/\/+$/, '')}/`)
  Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value))
  return Response.redirect(target.toString(), 302)
}

function retryPage(req: Request, orderCode: string) {
  const retryUrl = new URL(req.url)
  const safeOrderCode = orderCode.replace(/[<>&"']/g, '')
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PayPal payment confirmation</title><style>body{margin:0;background:#eefaf8;color:#07272d;font:16px/1.6 Arial,sans-serif}.card{max-width:560px;margin:10vh auto;padding:32px;border:1px solid #c8e3df;border-radius:20px;background:#fff;box-shadow:0 20px 60px rgba(7,39,45,.12)}a{display:inline-block;margin-top:12px;padding:12px 20px;border-radius:999px;background:#10aaa2;color:#fff;text-decoration:none;font-weight:700}</style></head><body><main class="card"><h1>We are still confirming your PayPal payment</h1><p>Your order ${safeOrderCode} has not been submitted twice. Retry confirmation now. If this message remains, contact OZ TECH M8 and quote the order number.</p><a href="${retryUrl.toString().replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">Retry confirmation</a></main></body></html>`,
    { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )
}

function verifyOrderAmount(paypalOrder: PayPalJson, localOrder: PayPalJson) {
  const purchaseUnit = firstPurchaseUnit(paypalOrder)
  const amount = object(purchaseUnit.amount)
  return (
    text(purchaseUnit.custom_id) === text(localOrder.order_code) &&
    text(amount.currency_code).toUpperCase() === text(localOrder.currency || 'AUD').toUpperCase() &&
    Math.abs(money(amount.value) - money(localOrder.total_amount)) <= 0.005
  )
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ ok: false, error: 'Method not allowed.' }, { status: 405 })
  }

  const url = new URL(req.url)
  const orderCode = text(url.searchParams.get('order_code'))
  const returnedOrderId = text(url.searchParams.get('token'))
  const cancelled = url.searchParams.get('cancelled') === '1'
  if (!orderCode) return siteRedirect('checkout.html', { payment: 'paypal_failed' })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
  let orderId: number | null = null
  let paypalOrderId = ''
  let captureWasConfirmed = false

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_code, payment_method_code, payment_status, status, total_amount, currency, paypal_order_id, paypal_capture_id')
      .eq('order_code', orderCode)
      .maybeSingle()
    if (orderError || !order || order.payment_method_code !== 'paypal' || !order.paypal_order_id) {
      return siteRedirect('checkout.html', { payment: 'paypal_failed', order_code: orderCode })
    }
    orderId = Number(order.id)
    paypalOrderId = text(order.paypal_order_id)

    if (returnedOrderId && returnedOrderId !== paypalOrderId) {
      await recordOrderEvent(supabaseAdmin, order.id, {
        eventKey: `paypal_order_mismatch:${crypto.randomUUID()}`,
        eventType: 'payment_failed',
        title: 'PayPal order could not be matched',
        description: 'The PayPal return token did not match the local order.',
        actor: { type: 'paypal', identifier: returnedOrderId },
      })
      return siteRedirect('checkout.html', { payment: 'paypal_failed', order_code: orderCode })
    }
    if (order.payment_status === 'paid' && order.paypal_capture_id) {
      return siteRedirect('checkout-success.html', { order_code: orderCode, payment: 'paypal' })
    }
    if (order.status === 'cancelled' || cancelled) {
      if (cancelled && order.status !== 'cancelled') {
        await supabaseAdmin
          .from('orders')
          .update({ paypal_payment_state: 'cancelled' })
          .eq('id', order.id)
          .neq('payment_status', 'paid')
        await recordOrderEvent(supabaseAdmin, order.id, {
          eventKey: `paypal_cancelled:${paypalOrderId}`,
          eventType: 'payment_failed',
          title: 'PayPal checkout cancelled',
          description: 'The customer returned without approving PayPal payment.',
          actor: { type: 'paypal', identifier: paypalOrderId },
        })
      }
      return siteRedirect('checkout.html', { payment: 'paypal_cancelled', order_code: orderCode })
    }

    const paypalOrder = await paypalRequest<PayPalJson>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`)
    if (!verifyOrderAmount(paypalOrder, order)) throw new Error('PayPal order verification failed.')
    const paypalStatus = text(paypalOrder.status).toUpperCase()
    if (!['APPROVED', 'COMPLETED'].includes(paypalStatus)) {
      throw new Error(`PayPal order is not approved (${paypalStatus || 'unknown'}).`)
    }

    const captureResponse = paypalStatus === 'COMPLETED'
      ? paypalOrder
      : await paypalRequest<PayPalJson>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
          method: 'POST',
          idempotencyKey: `techm8-paypal-capture-${order.id}`,
          body: {},
        })
    const capture = getPayPalCapture(captureResponse)
    const captureAmount = object(capture?.amount)
    const captureId = text(capture?.id)
    const captureStatus = text(capture?.status || captureResponse.status).toUpperCase()
    if (
      !captureId ||
      captureStatus !== 'COMPLETED' ||
      text(captureAmount.currency_code).toUpperCase() !== text(order.currency || 'AUD').toUpperCase() ||
      Math.abs(money(captureAmount.value) - money(order.total_amount)) > 0.005
    ) {
      throw new Error('PayPal did not confirm the expected captured payment.')
    }
    captureWasConfirmed = true

    const payer = object(captureResponse.payer)
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        paypal_capture_id: captureId,
        paypal_payer_id: text(payer.payer_id) || null,
        paypal_payment_state: 'completed',
      })
      .eq('id', order.id)
      .eq('paypal_order_id', paypalOrderId)
    if (updateError) throw updateError

    await finalizePaidOrder(
      supabaseAdmin,
      order.id,
      { type: 'paypal', identifier: captureId },
      { method: 'paypal', paypal_order_id: paypalOrderId, paypal_capture_id: captureId },
    )
    return siteRedirect('checkout-success.html', { order_code: orderCode, payment: 'paypal' })
  } catch (error) {
    console.error('PayPal payment return failed.', error)
    if (orderId) {
      try {
        if (!captureWasConfirmed) {
          await supabaseAdmin
            .from('orders')
            .update({ paypal_payment_state: 'capture_error' })
            .eq('id', orderId)
            .neq('payment_status', 'paid')
        }
        await recordOrderEvent(supabaseAdmin, orderId, {
          eventKey: `paypal_processing_error:${crypto.randomUUID()}`,
          eventType: 'payment_attention_required',
          title: captureWasConfirmed ? 'PayPal order completion requires attention' : 'PayPal capture requires reconciliation',
          description: captureWasConfirmed
            ? 'PayPal confirmed the capture, but the local order completion workflow did not finish.'
            : 'The PayPal response could not be confirmed. Do not create a second charge; retry this confirmation or reconcile it in PayPal.',
          actor: { type: 'paypal', identifier: paypalOrderId || null },
          data: {
            capture_confirmed: captureWasConfirmed,
            transient_provider_error: isTransientPayPalError(error),
            error: error instanceof Error ? error.message : String(error),
          },
        })
      } catch (stateError) {
        console.error('PayPal reconciliation state could not be recorded.', stateError)
      }
    }
    return retryPage(req, orderCode)
  }
})
