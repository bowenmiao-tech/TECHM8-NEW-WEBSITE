import { createClient } from 'npm:@supabase/supabase-js@2.49.8'
import {
  createOrderDocumentSignedUrl,
  ensureOrderDocument,
} from '../_shared/order-commerce.ts'
import { OrderDocumentType } from '../_shared/order-pdf.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const customerDocumentTypes = new Set<OrderDocumentType>([
  'order_confirmation',
  'invoice',
  'credit_note',
])

function text(value: unknown) {
  return String(value ?? '').trim()
}

function bearerToken(req: Request) {
  const authorization = req.headers.get('authorization') ?? ''
  return authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed.' }, { status: 405, headers: corsHeaders })
  }

  try {
    const token = bearerToken(req)
    if (!token) {
      return Response.json({ ok: false, error: 'Please sign in to access order documents.' }, { status: 401, headers: corsHeaders })
    }
    const body = await req.json()
    const orderCode = text(body.order_code)
    const documentType = text(body.document_type) as OrderDocumentType
    const sourceRef = text(body.source_ref)
    if (!orderCode || !customerDocumentTypes.has(documentType)) {
      return Response.json({ ok: false, error: 'A valid order document is required.' }, { status: 422, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authData.user) {
      return Response.json({ ok: false, error: 'Your session is no longer valid.' }, { status: 401, headers: corsHeaders })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_code, auth_user_id, store_slug, payment_method_code, payment_status')
      .eq('order_code', orderCode)
      .maybeSingle()
    if (orderError || !order) {
      return Response.json({ ok: false, error: 'Order was not found.' }, { status: 404, headers: corsHeaders })
    }

    let authorized = order.auth_user_id === authData.user.id
    if (!authorized) {
      const { data: admin } = await supabaseAdmin
        .from('admin_users')
        .select('role, store_slug, is_active')
        .eq('auth_user_id', authData.user.id)
        .eq('is_active', true)
        .maybeSingle()
      authorized = Boolean(admin && (admin.role === 'super_admin' || admin.store_slug === order.store_slug))
    }
    if (!authorized) {
      return Response.json({ ok: false, error: 'You do not have access to this order.' }, { status: 403, headers: corsHeaders })
    }

    const isPaid = ['paid', 'partially_refunded', 'refunded'].includes(order.payment_status)
    if (documentType === 'invoice' && !isPaid && order.payment_method_code !== 'pay_in_store') {
      return Response.json({ ok: false, error: 'The invoice is available after payment is confirmed.' }, { status: 409, headers: corsHeaders })
    }

    let document
    if (documentType === 'credit_note' && !sourceRef) {
      const { data: existing, error: documentError } = await supabaseAdmin
        .from('order_documents')
        .select('*')
        .eq('order_id', order.id)
        .eq('document_type', 'credit_note')
        .eq('status', 'ready')
        .order('issued_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (documentError) throw documentError
      if (!existing) {
        return Response.json({ ok: false, error: 'No credit note is available for this order.' }, { status: 404, headers: corsHeaders })
      }
      document = existing
    } else {
      document = await ensureOrderDocument(supabaseAdmin, Number(order.id), documentType, { sourceRef })
    }

    const signedUrl = await createOrderDocumentSignedUrl(supabaseAdmin, {
      storage_bucket: document.storage_bucket ?? document.bucket,
      storage_path: document.storage_path ?? document.path,
    })
    return Response.json({
      ok: true,
      document_type: documentType,
      document_number: document.document_number ?? document.number,
      file_name: document.file_name ?? document.fileName,
      signed_url: signedUrl,
      expires_in: 900,
    }, { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: 'Order document could not be prepared.' }, { status: 500, headers: corsHeaders })
  }
})
