import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@16'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type SupabaseAdmin = ReturnType<typeof createClient>

function buildInvoicePatch(invoice: Stripe.Invoice) {
  return {
    stripe_invoice_id: invoice.id,
    stripe_invoice_number: invoice.number ?? null,
    stripe_invoice_url: invoice.hosted_invoice_url ?? null,
    stripe_invoice_pdf_url: invoice.invoice_pdf ?? null,
  }
}

async function getSessionInvoicePatch(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const invoiceId =
    typeof session.invoice === 'string'
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
  patch: Record<string, unknown>
) {
  const sessionId = String(session.id || '').trim()
  const orderId = String(session.metadata?.order_id ?? '').trim()
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null

  const updatePatch = {
    ...patch,
    stripe_payment_intent_id: paymentIntentId,
    stripe_checkout_session_id: sessionId,
  }

  const response = orderId
    ? await supabaseAdmin.from('orders').update(updatePatch).eq('id', orderId)
    : await supabaseAdmin.from('orders').update(updatePatch).eq('stripe_checkout_session_id', sessionId)

  if (response.error) {
    throw response.error
  }
}

async function updateOrderByInvoice(
  supabaseAdmin: SupabaseAdmin,
  invoice: Stripe.Invoice,
  patch: Record<string, unknown>
) {
  const orderId = String(invoice.metadata?.order_id ?? '').trim()
  const orderCode = String(invoice.metadata?.order_code ?? '').trim()
  const updatePatch = {
    ...patch,
    ...buildInvoicePatch(invoice),
  }

  const query = supabaseAdmin.from('orders').update(updatePatch)
  const response = orderId
    ? await query.eq('id', orderId)
    : orderCode
      ? await query.eq('order_code', orderCode)
      : await query.eq('stripe_invoice_id', invoice.id)

  if (response.error) {
    throw response.error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed.' }, { status: 405, headers: corsHeaders })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

  if (!stripeSecretKey || !webhookSecret) {
    return Response.json({ ok: false, error: 'Stripe webhook is not configured.' }, { status: 500, headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })

    const rawBody = await req.text()
    const signature = req.headers.get('stripe-signature') ?? ''
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session
        const invoicePatch = await getSessionInvoicePatch(stripe, session)
        await updateOrderBySession(supabaseAdmin, session, {
          payment_status: 'paid',
          status: 'confirmed',
          fulfillment_status: 'queued',
          ...invoicePatch,
        })
        break
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await updateOrderByInvoice(supabaseAdmin, invoice, {
          payment_status: 'paid',
          status: 'confirmed',
          fulfillment_status: 'queued',
        })
        break
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session
        await updateOrderBySession(supabaseAdmin, session, {
          payment_status: 'failed',
          status: 'submitted',
          fulfillment_status: 'new',
        })
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        await updateOrderBySession(supabaseAdmin, session, {
          payment_status: 'failed',
          status: 'cancelled',
          fulfillment_status: 'cancelled',
        })
        break
      }

      default:
        break
    }

    return Response.json({ received: true }, { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: 'Stripe webhook verification failed.' }, { status: 400, headers: corsHeaders })
  }
})
