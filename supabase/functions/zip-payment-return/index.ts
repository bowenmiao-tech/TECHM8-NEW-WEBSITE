import { createClient } from 'npm:@supabase/supabase-js@2.49.8'
import {
  finalizePaidOrder,
  recordOrderEvent,
} from '../_shared/order-commerce.ts'
import { isTransientZipError, zipRequest } from '../_shared/zip-payments.ts'

type JsonRecord = Record<string, unknown>

function text(value: unknown) {
  return String(value ?? '').trim()
}

function money(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0
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
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zip payment confirmation</title><style>body{margin:0;background:#eefaf8;color:#07272d;font:16px/1.6 Arial,sans-serif}.card{max-width:560px;margin:10vh auto;padding:32px;border:1px solid #c8e3df;border-radius:20px;background:#fff;box-shadow:0 20px 60px rgba(7,39,45,.12)}a{display:inline-block;margin-top:12px;padding:12px 20px;border-radius:999px;background:#10aaa2;color:#fff;text-decoration:none;font-weight:700}</style></head><body><main class="card"><h1>We are still confirming your Zip payment</h1><p>Your order ${safeOrderCode} has not been submitted twice. Please retry the confirmation now. If the message remains, contact OZ TECH M8 and quote this order number.</p><a href="${retryUrl.toString().replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">Retry confirmation</a></main></body></html>`,
    { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ ok: false, error: 'Method not allowed.' }, { status: 405 })
  }

  const url = new URL(req.url)
  const orderCode = text(url.searchParams.get('order_code'))
  const result = text(url.searchParams.get('result')).toLowerCase()
  const returnedCheckoutId = text(url.searchParams.get('checkoutId') || url.searchParams.get('checkout_id'))
  if (!orderCode) return siteRedirect('checkout.html', { payment: 'zip_failed' })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
  let orderId: number | null = null
  let zipCheckoutId = ''
  let chargeWasConfirmed = false

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_code, payment_method_code, payment_status, status, total_amount, currency, zip_checkout_id, zip_charge_id')
      .eq('order_code', orderCode)
      .maybeSingle()
    if (orderError || !order || order.payment_method_code !== 'zip' || !order.zip_checkout_id) {
      return siteRedirect('checkout.html', { payment: 'zip_failed', order_code: orderCode })
    }
    orderId = Number(order.id)
    zipCheckoutId = text(order.zip_checkout_id)
    if (returnedCheckoutId && returnedCheckoutId !== order.zip_checkout_id) {
      await recordOrderEvent(supabaseAdmin, order.id, {
        eventKey: `zip_checkout_mismatch:${crypto.randomUUID()}`,
        eventType: 'payment_failed',
        title: 'Zip checkout could not be matched',
        description: 'The Zip return checkout identifier did not match the order.',
        actor: { type: 'zip', identifier: returnedCheckoutId },
      })
      return siteRedirect('checkout.html', { payment: 'zip_failed', order_code: orderCode })
    }
    if (order.payment_status === 'paid' && order.zip_charge_id) {
      return siteRedirect('checkout-success.html', { order_code: orderCode, payment: 'zip' })
    }
    if (order.status === 'cancelled') {
      return siteRedirect('checkout.html', { payment: 'zip_cancelled', order_code: orderCode })
    }

    if (result !== 'approved') {
      const state = result === 'declined' ? 'declined' : result === 'referred' ? 'referred' : 'cancelled'
      await supabaseAdmin
        .from('orders')
        .update({ payment_status: state === 'cancelled' ? 'pending' : 'failed', zip_payment_state: state })
        .eq('id', order.id)
      await recordOrderEvent(supabaseAdmin, order.id, {
        eventKey: `zip_${state}:${order.zip_checkout_id}`,
        eventType: 'payment_failed',
        title: state === 'referred' ? 'Zip payment referred' : state === 'declined' ? 'Zip payment declined' : 'Zip checkout cancelled',
        description: state === 'referred'
          ? 'Zip requires the customer to complete additional review.'
          : state === 'declined'
            ? 'Zip did not approve this checkout.'
            : 'The customer returned without Zip approval.',
        actor: { type: 'zip', identifier: order.zip_checkout_id },
      })
      return siteRedirect('checkout.html', { payment: `zip_${state}`, order_code: orderCode })
    }

    const checkout = await zipRequest<JsonRecord>(`/checkouts/${encodeURIComponent(order.zip_checkout_id)}`)
    const checkoutOrder = checkout.order && typeof checkout.order === 'object'
      ? checkout.order as JsonRecord
      : {}
    const checkoutState = text(checkout.state).toLowerCase()
    const checkoutReference = text(checkoutOrder.reference)
    const checkoutCurrency = text(checkoutOrder.currency).toUpperCase()
    const checkoutAmount = money(checkoutOrder.amount)
    const orderAmount = money(order.total_amount)
    if (
      !['approved', 'completed'].includes(checkoutState) ||
      checkoutReference !== order.order_code ||
      checkoutCurrency !== text(order.currency || 'AUD').toUpperCase() ||
      Math.abs(checkoutAmount - orderAmount) > 0.005
    ) {
      throw new Error('Zip checkout verification failed.')
    }

    const charge = await zipRequest<JsonRecord>('/charges', {
      method: 'POST',
      idempotencyKey: `techm8-zip-charge-${order.id}`,
      body: {
        authority: { type: 'checkout_id', value: order.zip_checkout_id },
        reference: order.order_code,
        amount: orderAmount,
        currency: 'AUD',
        capture: true,
      },
    })
    const chargeId = text(charge.id)
    const chargeState = text(charge.state).toLowerCase()
    if (!chargeId || !['approved', 'captured', 'authorised'].includes(chargeState)) {
      throw new Error('Zip did not confirm the payment charge.')
    }
    chargeWasConfirmed = true

    const { error: zipUpdateError } = await supabaseAdmin
      .from('orders')
      .update({
        zip_charge_id: chargeId,
        zip_receipt_number: text(charge.receipt_number) || null,
        zip_payment_state: chargeState,
      })
      .eq('id', order.id)
      .eq('zip_checkout_id', order.zip_checkout_id)
    if (zipUpdateError) throw zipUpdateError

    await finalizePaidOrder(
      supabaseAdmin,
      order.id,
      { type: 'zip', identifier: chargeId },
      {
        method: 'zip',
        zip_checkout_id: order.zip_checkout_id,
        zip_charge_id: chargeId,
        zip_receipt_number: text(charge.receipt_number) || null,
      },
    )
    return siteRedirect('checkout-success.html', { order_code: orderCode, payment: 'zip' })
  } catch (error) {
    console.error('Zip payment return failed.', error)
    if (orderId) {
      const transientProviderError = isTransientZipError(error)
      try {
        if (!chargeWasConfirmed) {
          await supabaseAdmin
            .from('orders')
            .update({ zip_payment_state: 'charge_error' })
            .eq('id', orderId)
            .neq('payment_status', 'paid')
        }
        await recordOrderEvent(supabaseAdmin, orderId, {
          eventKey: `zip_processing_error:${crypto.randomUUID()}`,
          eventType: 'payment_attention_required',
          title: chargeWasConfirmed ? 'Zip order completion requires attention' : 'Zip charge requires reconciliation',
          description: chargeWasConfirmed
            ? 'Zip confirmed the charge, but the order completion workflow did not finish.'
            : 'The Zip response could not be confirmed. Do not create a second charge; retry with the same order checkout or reconcile it in Zip Merchant Centre.',
          actor: { type: 'zip', identifier: zipCheckoutId || null },
          data: {
            charge_confirmed: chargeWasConfirmed,
            transient_provider_error: transientProviderError,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      } catch (stateError) {
        console.error('Zip reconciliation state could not be recorded.', stateError)
      }
    }
    return retryPage(req, orderCode)
  }
})
