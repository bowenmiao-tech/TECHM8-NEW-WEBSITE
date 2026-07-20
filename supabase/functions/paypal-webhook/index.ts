import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.8'
import {
  applySucceededRefund,
  finalizePaidOrder,
  recordOrderEvent,
} from '../_shared/order-commerce.ts'
import {
  getPayPalCapture,
  getPayPalLink,
  paypalRequest,
  verifyPayPalWebhook,
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

type SupabaseAdmin = SupabaseClient<any, 'public', any>

function captureAmount(capture: PayPalJson) {
  const amount = object(capture.amount)
  return { value: money(amount.value), currency: text(amount.currency_code).toUpperCase() }
}

function relatedOrderId(resource: PayPalJson) {
  const supplementaryData = object(resource.supplementary_data)
  const relatedIds = object(supplementaryData.related_ids)
  return text(relatedIds.order_id)
}

function relatedCaptureId(resource: PayPalJson) {
  const supplementaryData = object(resource.supplementary_data)
  const relatedIds = object(supplementaryData.related_ids)
  const direct = text(relatedIds.capture_id)
  if (direct) return direct
  const upLink = getPayPalLink(resource, 'up')
  if (!upLink) return ''
  try {
    return new URL(upLink).pathname.split('/').filter(Boolean).pop() || ''
  } catch {
    return ''
  }
}

async function findOrderForCapture(supabaseAdmin: SupabaseAdmin, capture: PayPalJson) {
  const paypalOrderId = relatedOrderId(capture)
  if (paypalOrderId) {
    const result = await supabaseAdmin.from('orders').select('*').eq('paypal_order_id', paypalOrderId).maybeSingle()
    if (result.error) throw result.error
    if (result.data) return result.data
  }
  const captureId = text(capture.id)
  if (captureId) {
    const result = await supabaseAdmin.from('orders').select('*').eq('paypal_capture_id', captureId).maybeSingle()
    if (result.error) throw result.error
    if (result.data) return result.data
  }
  return null
}

async function completeCapturedOrder(
  supabaseAdmin: SupabaseAdmin,
  order: PayPalJson,
  capture: PayPalJson,
  payerId = '',
) {
  const captureId = text(capture.id)
  const status = text(capture.status).toUpperCase()
  const amount = captureAmount(capture)
  if (
    !captureId ||
    status !== 'COMPLETED' ||
    amount.currency !== text(order.currency || 'AUD').toUpperCase() ||
    Math.abs(amount.value - money(order.total_amount)) > 0.005
  ) {
    throw new Error('PayPal webhook capture did not match the local order total.')
  }
  if (text(order.payment_status) === 'paid' && text(order.paypal_capture_id) === captureId) return

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      paypal_capture_id: captureId,
      paypal_payer_id: payerId || order.paypal_payer_id || null,
      paypal_payment_state: 'completed',
    })
    .eq('id', Number(order.id))
  if (updateError) throw updateError
  await finalizePaidOrder(
    supabaseAdmin,
    Number(order.id),
    { type: 'paypal', identifier: captureId },
    { method: 'paypal', paypal_order_id: order.paypal_order_id, paypal_capture_id: captureId },
  )
}

async function captureApprovedOrder(
  supabaseAdmin: SupabaseAdmin,
  paypalOrderId: string,
) {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('paypal_order_id', paypalOrderId)
    .maybeSingle()
  if (error) throw error
  if (!order || order.payment_method_code !== 'paypal') return
  if (order.status === 'cancelled') {
    await recordOrderEvent(supabaseAdmin, Number(order.id), {
      eventKey: `paypal_approval_ignored:${paypalOrderId}`,
      eventType: 'payment_attention_required',
      title: 'PayPal approval arrived after cancellation',
      description: 'The local order was already cancelled, so no capture was requested.',
      actor: { type: 'paypal', identifier: paypalOrderId },
    })
    return
  }
  if (order.payment_status === 'paid' && order.paypal_capture_id) return

  const response = await paypalRequest<PayPalJson>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    idempotencyKey: `techm8-paypal-capture-${order.id}`,
    body: {},
  })
  const capture = getPayPalCapture(response)
  if (!capture) throw new Error('PayPal approval webhook capture was missing.')
  const payer = object(response.payer)
  await completeCapturedOrder(supabaseAdmin, order, capture, text(payer.payer_id))
}

async function updatePayPalRefundState(
  supabaseAdmin: SupabaseAdmin,
  resource: PayPalJson,
) {
  const paypalRefundId = text(resource.id)
  if (!paypalRefundId) return
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('order_refunds')
    .select('*')
    .eq('paypal_refund_id', paypalRefundId)
    .maybeSingle()
  if (existingError) throw existingError
  if (!existing || existing.status === 'succeeded') return
  const status = text(resource.status).toUpperCase()
  const localStatus = status === 'COMPLETED' ? 'succeeded' : status === 'FAILED' ? 'failed' : status === 'CANCELLED' ? 'cancelled' : 'pending'
  const result = await supabaseAdmin
    .from('order_refunds')
    .update({
      status: localStatus,
      processed_at: localStatus === 'pending' ? null : new Date().toISOString(),
      provider_response: resource,
    })
    .eq('id', Number(existing.id))
    .select('*')
    .single()
  if (result.error || !result.data) throw result.error ?? new Error('PayPal refund could not be updated.')
  if (localStatus === 'succeeded') {
    await applySucceededRefund(
      supabaseAdmin,
      Number(existing.order_id),
      result.data,
      { type: 'paypal', identifier: paypalRefundId },
    )
  }
}

async function reconcileRefundedCapture(
  supabaseAdmin: SupabaseAdmin,
  resource: PayPalJson,
  eventId: string,
) {
  const captureId = text(resource.id) || relatedCaptureId(resource)
  if (!captureId) throw new Error('PayPal refunded capture identifier is missing.')
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('paypal_capture_id', captureId)
    .maybeSingle()
  if (orderError) throw orderError
  if (!order) return

  const { data: pendingRows, error: pendingError } = await supabaseAdmin
    .from('order_refunds')
    .select('*')
    .eq('order_id', order.id)
    .eq('provider', 'paypal')
    .eq('status', 'pending')
  if (pendingError) throw pendingError
  for (const pending of pendingRows ?? []) {
    const refundId = text(pending.paypal_refund_id)
    if (!refundId) continue
    const refund = await paypalRequest<PayPalJson>(`/v2/payments/refunds/${encodeURIComponent(refundId)}`)
    await updatePayPalRefundState(supabaseAdmin, refund)
  }

  const { data: succeededRows, error: succeededError } = await supabaseAdmin
    .from('order_refunds')
    .select('amount')
    .eq('order_id', order.id)
    .eq('status', 'succeeded')
  if (succeededError) throw succeededError
  const localRefunded = money((succeededRows ?? []).reduce((sum, row) => sum + money(row.amount), 0))
  const breakdown = object(resource.seller_receivable_breakdown)
  const providerTotalData = object(breakdown.total_refunded_amount)
  const captureStatus = text(resource.status).toUpperCase()
  const providerRefunded = money(providerTotalData.value) || (captureStatus === 'REFUNDED' ? money(order.total_amount) : 0)
  if (providerRefunded <= 0 && captureStatus === 'PARTIALLY_REFUNDED') {
    await recordOrderEvent(supabaseAdmin, Number(order.id), {
      eventKey: `paypal_refund_reconciliation_required:${eventId}`,
      eventType: 'refund_attention_required',
      title: 'PayPal partial refund requires reconciliation',
      description: 'PayPal reported a partial refund without an auditable cumulative refund amount. Review this transaction in PayPal.',
      actor: { type: 'paypal', identifier: captureId },
      data: resource,
    })
    return
  }
  const unreconciledAmount = money(providerRefunded - localRefunded)
  if (unreconciledAmount <= 0.005) return

  const currency = text(providerTotalData.currency_code).toUpperCase() || text(order.currency || 'AUD').toUpperCase()
  const unlinkedPending = (pendingRows ?? []).find((pending) => !text(pending.paypal_refund_id))
  if (unlinkedPending && Math.abs(money(unlinkedPending.amount) - unreconciledAmount) <= 0.005) {
    const { data: savedPending, error: pendingUpdateError } = await supabaseAdmin
      .from('order_refunds')
      .update({
        paypal_refund_id: `webhook:${eventId}`,
        status: 'succeeded',
        processed_at: new Date().toISOString(),
        provider_response: resource,
      })
      .eq('id', Number(unlinkedPending.id))
      .select('*')
      .single()
    if (pendingUpdateError || !savedPending) {
      throw pendingUpdateError ?? new Error('Pending PayPal refund could not be reconciled.')
    }
    await applySucceededRefund(
      supabaseAdmin,
      Number(order.id),
      savedPending,
      { type: 'paypal', identifier: eventId },
    )
    return
  }
  const { data: savedRefund, error: insertError } = await supabaseAdmin
    .from('order_refunds')
    .insert({
      order_id: order.id,
      provider: 'paypal',
      paypal_refund_id: `webhook:${eventId}`,
      amount: unreconciledAmount,
      currency,
      reason: 'Refund processed directly through PayPal.',
      status: 'succeeded',
      requested_by: 'paypal',
      processed_at: new Date().toISOString(),
      provider_response: resource,
    })
    .select('*')
    .single()
  if (insertError?.code === '23505') return
  if (insertError || !savedRefund) throw insertError ?? new Error('External PayPal refund could not be recorded.')
  await applySucceededRefund(
    supabaseAdmin,
    Number(order.id),
    savedRefund,
    { type: 'paypal', identifier: eventId },
  )
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed.' }, { status: 405 })
  }
  const event = await req.json() as PayPalJson
  if (!(await verifyPayPalWebhook(req, event))) {
    return Response.json({ ok: false, error: 'Invalid PayPal webhook signature.' }, { status: 400 })
  }

  const eventId = text(event.id)
  const eventType = text(event.event_type)
  if (!eventId || !eventType) {
    return Response.json({ ok: false, error: 'Invalid PayPal webhook payload.' }, { status: 400 })
  }
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('paypal_webhook_events')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing?.status === 'processed') return Response.json({ received: true })

  const { error: ledgerError } = await supabaseAdmin
    .from('paypal_webhook_events')
    .upsert({
      event_id: eventId,
      event_type: eventType,
      status: 'processing',
      attempt_count: Number(existing?.attempt_count || 0) + 1,
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id' })
  if (ledgerError) throw ledgerError

  try {
    const resource = object(event.resource)
    if (eventType === 'CHECKOUT.ORDER.APPROVED') {
      await captureApprovedOrder(supabaseAdmin, text(resource.id))
    } else if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const order = await findOrderForCapture(supabaseAdmin, resource)
      if (order) await completeCapturedOrder(supabaseAdmin, order, resource)
    } else if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
      await reconcileRefundedCapture(supabaseAdmin, resource, eventId)
    } else if (['PAYMENT.REFUND.PENDING', 'PAYMENT.REFUND.FAILED'].includes(eventType)) {
      await updatePayPalRefundState(supabaseAdmin, resource)
    } else if (['PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.DECLINED', 'PAYMENT.CAPTURE.REVERSED'].includes(eventType)) {
      const order = await findOrderForCapture(supabaseAdmin, resource)
      if (order) {
        await supabaseAdmin
          .from('orders')
          .update({ paypal_payment_state: eventType.toLowerCase(), payment_status: 'failed' })
          .eq('id', Number(order.id))
          .neq('payment_status', 'paid')
        await recordOrderEvent(supabaseAdmin, Number(order.id), {
          eventKey: `paypal_${eventType.toLowerCase()}:${eventId}`,
          eventType: 'payment_failed',
          title: 'PayPal payment failed',
          description: `PayPal reported ${eventType}.`,
          actor: { type: 'paypal', identifier: text(resource.id) || eventId },
        })
      }
    }

    await supabaseAdmin
      .from('paypal_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('event_id', eventId)
    return Response.json({ received: true })
  } catch (error) {
    await supabaseAdmin
      .from('paypal_webhook_events')
      .update({
        status: 'failed',
        last_error: error instanceof Error ? error.message : String(error),
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
    console.error('PayPal webhook processing failed.', error)
    return Response.json({ ok: false, error: 'PayPal webhook processing failed.' }, { status: 500 })
  }
})
