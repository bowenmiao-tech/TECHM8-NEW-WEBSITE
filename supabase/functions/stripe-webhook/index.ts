import { createClient } from 'npm:@supabase/supabase-js@2.49.8'
import Stripe from 'npm:stripe@16.12.0'
import {
  applySucceededRefund,
  finalizePaidOrder,
  notifyOrderEvent,
  recordOrderEvent,
} from '../_shared/order-commerce.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type SupabaseAdmin = ReturnType<typeof createClient>

function text(value: unknown) {
  return String(value ?? '').trim()
}

function buildInvoicePatch(invoice: Stripe.Invoice) {
  return {
    stripe_invoice_id: invoice.id,
    stripe_invoice_number: invoice.number ?? null,
    stripe_invoice_url: invoice.hosted_invoice_url ?? null,
    stripe_invoice_pdf_url: invoice.invoice_pdf ?? null,
  }
}

function buildSessionCustomerPatch(session: Stripe.Checkout.Session) {
  const details = session.customer_details
  const address = details?.address
  if (!details && !address) return {}
  return {
    billing_snapshot: {
      recipient_name: text(details?.name),
      email: text(details?.email),
      phone: text(details?.phone),
      address_line_1: text(address?.line1),
      address_line_2: text(address?.line2),
      suburb: text(address?.city),
      state: text(address?.state),
      postcode: text(address?.postal_code),
      country_code: text(address?.country) || 'AU',
    },
  }
}

async function getSessionInvoicePatch(stripe: Stripe, session: Stripe.Checkout.Session) {
  const invoiceId = typeof session.invoice === 'string'
    ? session.invoice
    : session.invoice?.id ?? ''
  if (!invoiceId) return {}
  if (typeof session.invoice === 'object' && session.invoice) {
    return buildInvoicePatch(session.invoice)
  }
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId)
    return buildInvoicePatch(invoice)
  } catch (error) {
    console.error('Stripe invoice could not be retrieved yet.', error)
    return { stripe_invoice_id: invoiceId }
  }
}

async function updateOrderBySession(
  supabaseAdmin: SupabaseAdmin,
  session: Stripe.Checkout.Session,
  patch: Record<string, unknown>,
) {
  const sessionId = text(session.id)
  const orderId = text(session.metadata?.order_id)
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null
  const updatePatch = {
    ...patch,
    ...buildSessionCustomerPatch(session),
    stripe_payment_intent_id: paymentIntentId,
    stripe_checkout_session_id: sessionId,
    stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
  }
  let query = supabaseAdmin.from('orders').update(updatePatch)
  query = orderId ? query.eq('id', orderId) : query.eq('stripe_checkout_session_id', sessionId)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error('Stripe event could not be matched to an order.')
  return Number(data.id)
}

async function updateOrderByInvoice(
  supabaseAdmin: SupabaseAdmin,
  invoice: Stripe.Invoice,
  patch: Record<string, unknown>,
) {
  const orderId = text(invoice.metadata?.order_id)
  const orderCode = text(invoice.metadata?.order_code)
  const updatePatch = { ...patch, ...buildInvoicePatch(invoice) }
  let query = supabaseAdmin.from('orders').update(updatePatch)
  query = orderId
    ? query.eq('id', orderId)
    : orderCode
      ? query.eq('order_code', orderCode)
      : query.eq('stripe_invoice_id', invoice.id)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error('Stripe invoice could not be matched to an order.')
  return Number(data.id)
}

async function beginWebhookEvent(supabaseAdmin: SupabaseAdmin, event: Stripe.Event) {
  const { error: insertError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, event_type: event.type, status: 'processing', attempt_count: 1 })
  if (!insertError) return true
  if (insertError.code !== '23505') throw insertError

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('*')
    .eq('event_id', event.id)
    .single()
  if (existingError) throw existingError
  const processingIsStale = existing.status === 'processing'
    && Date.parse(String(existing.updated_at || '')) <= Date.now() - 5 * 60 * 1000
  if (existing.status === 'processed' || (existing.status === 'processing' && !processingIsStale)) return false

  const { data: claimed, error: retryError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .update({
      status: 'processing',
      attempt_count: Number(existing.attempt_count || 0) + 1,
      last_error: null,
    })
    .eq('event_id', event.id)
    .eq('status', String(existing.status))
    .eq('updated_at', String(existing.updated_at))
    .select('event_id')
    .maybeSingle()
  if (retryError) throw retryError
  return Boolean(claimed?.event_id)
}

async function finishWebhookEvent(
  supabaseAdmin: SupabaseAdmin,
  eventId: string,
  status: 'processed' | 'failed',
  error?: unknown,
) {
  await supabaseAdmin
    .from('stripe_webhook_events')
    .update({
      status,
      processed_at: status === 'processed' ? new Date().toISOString() : null,
      last_error: status === 'failed'
        ? (error instanceof Error ? error.message : String(error ?? 'Unknown webhook error'))
        : null,
    })
    .eq('event_id', eventId)
}

async function findOrderByPaymentIntent(supabaseAdmin: SupabaseAdmin, paymentIntentId: string) {
  if (!paymentIntentId) return null
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()
  if (error) throw error
  return data?.id ? Number(data.id) : null
}

async function syncRefund(supabaseAdmin: SupabaseAdmin, refund: Stripe.Refund) {
  const paymentIntentId = typeof refund.payment_intent === 'string'
    ? refund.payment_intent
    : refund.payment_intent?.id ?? ''
  const orderId = await findOrderByPaymentIntent(supabaseAdmin, paymentIntentId)
  if (!orderId) throw new Error(`Refund ${refund.id} could not be matched to an order.`)

  const status = refund.status === 'succeeded'
    ? 'succeeded'
    : refund.status === 'failed'
      ? 'failed'
      : refund.status === 'canceled'
        ? 'cancelled'
        : 'pending'
  const refundRow = {
    order_id: orderId,
    provider: 'stripe',
    stripe_refund_id: refund.id,
    amount: Number((refund.amount / 100).toFixed(2)),
    currency: text(refund.currency).toUpperCase() || 'AUD',
    reason: text(refund.reason) || text(refund.metadata?.reason) || null,
    status,
    requested_by: text(refund.metadata?.requested_by) || 'stripe',
    provider_response: {
      payment_intent: paymentIntentId,
      charge: typeof refund.charge === 'string' ? refund.charge : refund.charge?.id ?? null,
      failure_reason: refund.failure_reason ?? null,
    },
    processed_at: status === 'succeeded' || status === 'failed' ? new Date().toISOString() : null,
  }
  const internalRefundId = Number(refund.metadata?.techm8_refund_id)
  const refundQuery = Number.isFinite(internalRefundId) && internalRefundId > 0
    ? supabaseAdmin
        .from('order_refunds')
        .update(refundRow)
        .eq('id', internalRefundId)
        .eq('order_id', orderId)
        .select('*')
        .maybeSingle()
    : supabaseAdmin
        .from('order_refunds')
        .upsert(refundRow, { onConflict: 'stripe_refund_id' })
        .select('*')
        .single()
  const { data: savedRefund, error: refundError } = await refundQuery
  if (refundError) throw refundError
  if (!savedRefund) throw new Error(`Refund ${refund.id} could not be reconciled with the internal refund request.`)

  if (status === 'succeeded') {
    await applySucceededRefund(supabaseAdmin, orderId, savedRefund, {
      type: 'stripe',
      identifier: refund.id,
    })
  } else if (status === 'failed') {
    await recordOrderEvent(supabaseAdmin, orderId, {
      eventKey: `refund_failed:${refund.id}`,
      eventType: 'refund_failed',
      title: 'Refund failed',
      description: refund.failure_reason || 'Stripe reported that the refund failed.',
      actor: { type: 'stripe', identifier: refund.id },
      data: refundRow,
    })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed.' }, { status: 405, headers: corsHeaders })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
  if (!stripeSecretKey || !webhookSecret) {
    return Response.json({ ok: false, error: 'Stripe webhook is not configured.' }, { status: 500, headers: corsHeaders })
  }

  let event: Stripe.Event | null = null
  let supabaseAdmin: SupabaseAdmin | null = null
  try {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
    const rawBody = await req.text()
    const signature = req.headers.get('stripe-signature') ?? ''
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)
    supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const shouldProcess = await beginWebhookEvent(supabaseAdmin, event)
    if (!shouldProcess) {
      return Response.json({ received: true, duplicate: true }, { status: 200, headers: corsHeaders })
    }

    switch (String(event.type)) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const invoicePatch = await getSessionInvoicePatch(stripe, session)
        const orderId = await updateOrderBySession(supabaseAdmin, session, invoicePatch)
        if (session.payment_status === 'paid') {
          await finalizePaidOrder(supabaseAdmin, orderId, {
            type: 'stripe',
            identifier: event.id,
          }, {
            stripe_event_id: event.id,
            checkout_session_id: session.id,
          })
        } else {
          await recordOrderEvent(supabaseAdmin, orderId, {
            eventKey: `payment_processing:${session.id}`,
            eventType: 'payment_processing',
            title: 'Payment processing',
            description: 'Checkout completed and Stripe is still processing the payment.',
            actor: { type: 'stripe', identifier: event.id },
          })
        }
        break
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session
        const invoicePatch = await getSessionInvoicePatch(stripe, session)
        const orderId = await updateOrderBySession(supabaseAdmin, session, invoicePatch)
        await finalizePaidOrder(supabaseAdmin, orderId, {
          type: 'stripe',
          identifier: event.id,
        }, {
          stripe_event_id: event.id,
          checkout_session_id: session.id,
        })
        break
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const orderId = await updateOrderByInvoice(supabaseAdmin, invoice, {})
        await finalizePaidOrder(supabaseAdmin, orderId, {
          type: 'stripe',
          identifier: event.id,
        }, {
          stripe_event_id: event.id,
          stripe_invoice_id: invoice.id,
        })
        break
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = await updateOrderBySession(supabaseAdmin, session, {
          payment_status: 'failed',
          status: 'submitted',
          fulfillment_status: 'new',
        })
        await recordOrderEvent(supabaseAdmin, orderId, {
          eventKey: `payment_failed:${session.id}`,
          eventType: 'payment_failed',
          title: 'Payment failed',
          description: 'Stripe reported that the asynchronous payment failed.',
          actor: { type: 'stripe', identifier: event.id },
        })
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = await updateOrderBySession(supabaseAdmin, session, {
          payment_status: 'failed',
          status: 'cancelled',
          fulfillment_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: 'Stripe Checkout session expired.',
        })
        await recordOrderEvent(supabaseAdmin, orderId, {
          eventKey: `order_cancelled:${session.id}`,
          eventType: 'order_cancelled',
          title: 'Order cancelled',
          description: 'The Stripe Checkout session expired before payment completed.',
          actor: { type: 'stripe', identifier: event.id },
        })
        await notifyOrderEvent(supabaseAdmin, orderId, 'cancelled')
        break
      }

      case 'refund.created':
      case 'refund.updated':
      case 'refund.failed': {
        await syncRefund(supabaseAdmin, event.data.object as Stripe.Refund)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        for (const refund of charge.refunds?.data ?? []) {
          await syncRefund(supabaseAdmin, refund)
        }
        break
      }

      default:
        break
    }

    await finishWebhookEvent(supabaseAdmin, event.id, 'processed')
    return Response.json({ received: true }, { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error(error)
    if (event?.id && supabaseAdmin) {
      await finishWebhookEvent(supabaseAdmin, event.id, 'failed', error)
    }
    const verified = Boolean(event)
    return Response.json(
      { ok: false, error: verified ? 'Stripe webhook processing failed.' : 'Stripe webhook verification failed.' },
      { status: verified ? 500 : 400, headers: corsHeaders },
    )
  }
})
