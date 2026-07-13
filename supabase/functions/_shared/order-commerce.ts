import {
  BusinessProfile,
  getDocumentPrefix,
  getDocumentTitle,
  JsonRecord,
  OrderBundle,
  OrderDocumentType,
  RefundDocumentData,
  StoreSnapshot,
  generateOrderPdf,
} from './order-pdf.ts'

type SupabaseAdmin = any

export const ORDER_DOCUMENT_BUCKET = 'order-documents'
export const CENTRAL_ORDER_EMAIL = 'techm8contact@gmail.com'

export type OrderActor = {
  type: 'system' | 'customer' | 'admin' | 'stripe'
  identifier?: string | null
}

export type OrderEmailEvent =
  | 'order_submitted'
  | 'payment_confirmed'
  | 'ready_for_pickup'
  | 'shipped'
  | 'cancelled'
  | 'refunded'

export type GeneratedOrderDocument = {
  id: number
  type: OrderDocumentType
  number: string
  title: string
  sourceRef: string
  bucket: string
  path: string
  fileName: string
  bytes: Uint8Array
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function numeric(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function decimal(value: number) {
  return Number(value.toFixed(2))
}

function truthy(value: unknown) {
  return ['1', 'true', 'yes', 'on'].includes(text(value).toLowerCase())
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function money(value: unknown) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(numeric(value))
}

function dateTime(value: unknown) {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function statusLabel(value: unknown) {
  return text(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase()) || '-'
}

function validEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value))
}

function normalizeEmail(value: unknown) {
  return text(value).toLowerCase()
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

export function getBusinessProfile(): BusinessProfile {
  return {
    legalName: text(Deno.env.get('TECHM8_BUSINESS_NAME')) || 'YQM PTY LTD',
    tradingName: text(Deno.env.get('TECHM8_TRADING_NAME')) || 'TECHM8',
    abn: text(Deno.env.get('TECHM8_ABN')),
    gstRegistered: truthy(Deno.env.get('TECHM8_GST_REGISTERED')),
    centralEmail: text(Deno.env.get('TECHM8_CENTRAL_ORDER_EMAIL')) || CENTRAL_ORDER_EMAIL,
  }
}

export function snapshotStore(store: JsonRecord | null | undefined): StoreSnapshot {
  if (!store) return {}
  return {
    slug: text(store.slug) || null,
    name: text(store.name) || null,
    email: text(store.email) || null,
    phone: text(store.phone) || null,
    address_line_1: text(store.address_line_1) || null,
    address_line_2: text(store.address_line_2) || null,
    suburb: text(store.suburb) || null,
    state: text(store.state) || null,
    postcode: text(store.postcode) || null,
    country_code: 'AU',
  }
}

export function buildFulfillmentSnapshot(input: {
  fulfillmentMethod: string
  selectedStore: JsonRecord | null | undefined
  recipientName?: string | null
  companyName?: string | null
  phone?: string | null
  email?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  suburb?: string | null
  state?: string | null
  postcode?: string | null
  countryCode?: string | null
}) {
  if (input.fulfillmentMethod !== 'shipping') {
    return { method: 'pickup', ...snapshotStore(input.selectedStore) }
  }
  return {
    method: 'shipping',
    recipient_name: text(input.recipientName) || null,
    company_name: text(input.companyName) || null,
    phone: text(input.phone) || null,
    email: text(input.email) || null,
    address_line_1: text(input.addressLine1) || null,
    address_line_2: text(input.addressLine2) || null,
    suburb: text(input.suburb) || null,
    state: text(input.state) || null,
    postcode: text(input.postcode) || null,
    country_code: text(input.countryCode) || 'AU',
  }
}

export async function loadOrderBundle(supabaseAdmin: SupabaseAdmin, orderId: number): Promise<OrderBundle> {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()
  if (orderError || !order) throw orderError ?? new Error('Order was not found.')

  const [{ data: items, error: itemsError }, { data: store, error: storeError }] = await Promise.all([
    supabaseAdmin
      .from('order_items')
      .select('id, sku, product_name, quantity, unit_price, line_total, image_url')
      .eq('order_id', orderId)
      .order('id', { ascending: true }),
    supabaseAdmin
      .from('stores')
      .select('id, slug, name, email, phone, address_line_1, address_line_2, suburb, state, postcode')
      .eq('slug', order.store_slug)
      .maybeSingle(),
  ])
  if (itemsError) throw itemsError
  if (storeError) console.error('Order store could not be loaded.', storeError)

  let issuer = order.issuer_snapshot && Object.keys(order.issuer_snapshot).length
    ? order.issuer_snapshot
    : null
  if (!issuer) {
    const issuerSlug = order.fulfillment_method === 'shipping' ? 'park-ridge' : order.store_slug
    const { data: issuerStore } = await supabaseAdmin
      .from('stores')
      .select('slug, name, email, phone, address_line_1, address_line_2, suburb, state, postcode')
      .eq('slug', issuerSlug)
      .maybeSingle()
    issuer = snapshotStore(issuerStore)
  }

  return {
    order,
    items: items ?? [],
    store: store ? snapshotStore(store) : null,
    issuer,
  }
}

export async function recordOrderEvent(
  supabaseAdmin: SupabaseAdmin,
  orderId: number,
  input: {
    eventKey: string
    eventType: string
    title: string
    description?: string | null
    actor?: OrderActor
    data?: JsonRecord
  },
) {
  const { data, error } = await supabaseAdmin
    .from('order_events')
    .insert({
      order_id: orderId,
      event_key: input.eventKey,
      event_type: input.eventType,
      title: input.title,
      description: text(input.description) || null,
      actor_type: input.actor?.type ?? 'system',
      actor_identifier: text(input.actor?.identifier) || null,
      event_data: input.data ?? {},
    })
    .select('*')
    .single()
  if (error?.code === '23505') return null
  if (error) throw error
  return data
}

function documentFileName(type: OrderDocumentType, orderCode: string, number: string) {
  const suffix = type.replaceAll('_', '-')
  return `${orderCode}-${suffix}-${number}.pdf`.replace(/[^A-Za-z0-9._-]/g, '-')
}

function documentOrderPatch(type: OrderDocumentType, documentNumber: string, storagePath: string) {
  if (type === 'order_confirmation') {
    return {
      confirmation_number: documentNumber,
      confirmation_document_path: storagePath,
    }
  }
  if (type === 'invoice') {
    return {
      invoice_number: documentNumber,
      invoice_document_path: storagePath,
      invoice_issued_at: new Date().toISOString(),
    }
  }
  if (type === 'packing_slip') return { packing_slip_path: storagePath }
  if (type === 'shipping_label' || type === 'pickup_label') return { shipping_label_path: storagePath }
  return {}
}

async function downloadDocumentBytes(
  supabaseAdmin: SupabaseAdmin,
  bucket: string,
  path: string,
) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path)
  if (error || !data) return null
  return new Uint8Array(await data.arrayBuffer())
}

export async function ensureOrderDocument(
  supabaseAdmin: SupabaseAdmin,
  orderId: number,
  type: OrderDocumentType,
  options: {
    sourceRef?: string | null
    refund?: RefundDocumentData | null
    forceRegenerate?: boolean
  } = {},
): Promise<GeneratedOrderDocument> {
  const sourceRef = text(options.sourceRef)
  let { data: row, error: lookupError } = await supabaseAdmin
    .from('order_documents')
    .select('*')
    .eq('order_id', orderId)
    .eq('document_type', type)
    .eq('source_ref', sourceRef)
    .maybeSingle()
  if (lookupError) throw lookupError

  if (!options.forceRegenerate && row?.status === 'ready' && row.storage_path && row.document_number && row.file_name) {
    const existingBytes = await downloadDocumentBytes(
      supabaseAdmin,
      row.storage_bucket || ORDER_DOCUMENT_BUCKET,
      row.storage_path,
    )
    if (existingBytes) {
      return {
        id: row.id,
        type,
        number: row.document_number,
        title: row.title,
        sourceRef,
        bucket: row.storage_bucket || ORDER_DOCUMENT_BUCKET,
        path: row.storage_path,
        fileName: row.file_name,
        bytes: existingBytes,
      }
    }
  }

  const business = getBusinessProfile()
  const title = getDocumentTitle(type, business)
  if (!row) {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('order_documents')
      .insert({
        order_id: orderId,
        document_type: type,
        source_ref: sourceRef,
        title,
        status: 'generating',
      })
      .select('*')
      .single()
    if (insertError?.code === '23505') {
      const { data: concurrentRow, error: concurrentError } = await supabaseAdmin
        .from('order_documents')
        .select('*')
        .eq('order_id', orderId)
        .eq('document_type', type)
        .eq('source_ref', sourceRef)
        .single()
      if (concurrentError) throw concurrentError
      row = concurrentRow
    } else if (insertError || !inserted) {
      throw insertError ?? new Error('Order document row could not be created.')
    } else {
      row = inserted
    }
  }

  const bundle = await loadOrderBundle(supabaseAdmin, orderId)
  if (business.gstRegistered && business.abn && numeric(bundle.order.gst_amount) === 0) {
    const gstAmount = decimal(numeric(bundle.order.total_amount) / 11)
    const { error: gstError } = await supabaseAdmin
      .from('orders')
      .update({ gst_amount: gstAmount })
      .eq('id', orderId)
    if (gstError) throw gstError
    bundle.order.gst_amount = gstAmount
  }

  const year = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
  }).format(new Date())
  const documentNumber = row.document_number || `TM8-${getDocumentPrefix(type)}-${year}-${String(row.id).padStart(6, '0')}`
  const fileName = row.file_name || documentFileName(type, bundle.order.order_code, documentNumber)
  const storagePath = row.storage_path || `${orderId}/${fileName}`

  try {
    const bytes = await generateOrderPdf(bundle, type, documentNumber, business, options.refund)
    const { error: uploadError } = await supabaseAdmin.storage
      .from(ORDER_DOCUMENT_BUCKET)
      .upload(storagePath, bytes, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true,
      })
    if (uploadError) throw uploadError

    const issuedAt = new Date().toISOString()
    const { error: documentError } = await supabaseAdmin
      .from('order_documents')
      .update({
        document_number: documentNumber,
        title,
        status: 'ready',
        storage_bucket: ORDER_DOCUMENT_BUCKET,
        storage_path: storagePath,
        file_name: fileName,
        mime_type: 'application/pdf',
        document_data: options.refund ? { refund: options.refund } : {},
        issued_at: issuedAt,
      })
      .eq('id', row.id)
    if (documentError) throw documentError

    const orderPatch = documentOrderPatch(type, documentNumber, storagePath)
    if (Object.keys(orderPatch).length) {
      const { error: orderError } = await supabaseAdmin
        .from('orders')
        .update(orderPatch)
        .eq('id', orderId)
      if (orderError) throw orderError
    }

    return {
      id: row.id,
      type,
      number: documentNumber,
      title,
      sourceRef,
      bucket: ORDER_DOCUMENT_BUCKET,
      path: storagePath,
      fileName,
      bytes,
    }
  } catch (error) {
    await supabaseAdmin
      .from('order_documents')
      .update({ status: 'failed', document_data: { error: error instanceof Error ? error.message : String(error) } })
      .eq('id', row.id)
    throw error
  }
}

export async function createOrderDocumentSignedUrl(
  supabaseAdmin: SupabaseAdmin,
  document: { storage_bucket?: string | null; storage_path?: string | null },
  expiresIn = 900,
) {
  const bucket = text(document.storage_bucket) || ORDER_DOCUMENT_BUCKET
  const path = text(document.storage_path)
  if (!path) throw new Error('Document is not ready.')
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) throw error ?? new Error('Document link could not be created.')
  return data.signedUrl
}

function renderItems(bundle: OrderBundle) {
  return bundle.items.map((item) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #d9e7e5">
        <strong>${escapeHtml(item.product_name || 'Item')}</strong>
        ${item.sku ? `<div style="color:#607981;font-size:12px">SKU: ${escapeHtml(item.sku)}</div>` : ''}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #d9e7e5;text-align:center">${escapeHtml(item.quantity || 0)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #d9e7e5;text-align:right">${escapeHtml(money(item.line_total))}</td>
    </tr>
  `).join('')
}

function renderEmailShell(title: string, content: string) {
  return `
    <div style="margin:0;padding:0;background:#eefaf8">
      <div style="max-width:720px;margin:0 auto;padding:28px 16px;font-family:Arial,Helvetica,sans-serif;color:#10242c;line-height:1.6">
        <div style="background:#ffffff;border:1px solid #cce8e4;border-radius:20px;overflow:hidden">
          <div style="padding:22px 26px;background:#052d32;color:#ffffff">
            <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#05ceac;font-weight:700">TECHM8 AUSTRALIA</div>
            <div style="font-size:24px;font-weight:800;margin-top:4px">${escapeHtml(title)}</div>
          </div>
          <div style="padding:26px">${content}</div>
        </div>
        <p style="margin:18px 0 0;color:#607981;font-size:12px;text-align:center">TECHM8 Australia | ${escapeHtml(getBusinessProfile().centralEmail)}</p>
      </div>
    </div>
  `
}

function renderOrderTable(bundle: OrderBundle) {
  const order = bundle.order
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:22px 0">
      <tr><td style="padding:7px 0;color:#607981">Order reference</td><td style="padding:7px 0;text-align:right;font-weight:700">${escapeHtml(order.order_code)}</td></tr>
      <tr><td style="padding:7px 0;color:#607981">Placed</td><td style="padding:7px 0;text-align:right">${escapeHtml(dateTime(order.created_at))}</td></tr>
      <tr><td style="padding:7px 0;color:#607981">Fulfilment</td><td style="padding:7px 0;text-align:right">${escapeHtml(order.fulfillment_method === 'shipping' ? 'Shipping' : `Pickup - ${bundle.store?.name || order.store_slug}`)}</td></tr>
      <tr><td style="padding:7px 0;color:#607981">Payment</td><td style="padding:7px 0;text-align:right">${escapeHtml(order.payment_method_label || '-')} | ${escapeHtml(statusLabel(order.payment_status))}</td></tr>
      <tr><td style="padding:7px 0;color:#607981">Total</td><td style="padding:7px 0;text-align:right;font-size:18px;font-weight:800">${escapeHtml(money(order.total_amount))}</td></tr>
    </table>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:18px 0">
      <thead><tr><th style="padding:9px 8px;text-align:left;background:#eefaf8">Item</th><th style="padding:9px 8px;background:#eefaf8">Qty</th><th style="padding:9px 8px;text-align:right;background:#eefaf8">Amount</th></tr></thead>
      <tbody>${renderItems(bundle)}</tbody>
    </table>
  `
}

function emailCopy(event: OrderEmailEvent, bundle: OrderBundle, role: 'customer' | 'store' | 'central', refund?: RefundDocumentData | null) {
  const order = bundle.order
  const internal = role !== 'customer'
  const customerName = text(order.customer_name) || 'Customer'
  const storeName = text(bundle.store?.name) || text(order.store_slug) || 'TECHM8'
  let title = ''
  let subject = ''
  let intro = ''
  let detail = ''

  switch (event) {
    case 'order_submitted':
      title = internal ? 'New order received' : 'Your order is confirmed'
      subject = internal
        ? `[TECHM8 Order] ${order.order_code} - ${storeName}`
        : `Your TECHM8 order is confirmed: ${order.order_code}`
      intro = internal
        ? `A new ${order.fulfillment_method === 'shipping' ? 'shipping' : 'pickup'} order has been submitted.`
        : `Thanks ${customerName}. We have received your order.`
      detail = order.payment_method_code === 'pay_in_store'
        ? 'Your order confirmation and invoice are attached. Payment is due at the selected store when the order is collected.'
        : 'Payment confirmation will be sent after the payment provider confirms the transaction.'
      break
    case 'payment_confirmed':
      title = internal ? 'Paid order confirmed' : 'Payment received'
      subject = internal
        ? `[TECHM8 Paid] ${order.order_code} - ${storeName}`
        : `Payment received and invoice ready: ${order.order_code}`
      intro = internal
        ? `Payment has been confirmed for ${order.order_code}.`
        : `Thanks ${customerName}. Your payment has been received.`
      detail = 'The English invoice is attached to this email.'
      break
    case 'ready_for_pickup':
      title = internal ? 'Order marked ready for pickup' : 'Your order is ready for pickup'
      subject = internal
        ? `[TECHM8 Pickup Ready] ${order.order_code}`
        : `Your TECHM8 order is ready for pickup: ${order.order_code}`
      intro = internal ? `${order.order_code} has been marked ready for pickup.` : `Hi ${customerName}, your order is ready to collect from ${storeName}.`
      detail = 'Please bring your order reference and photo identification when collecting the order.'
      break
    case 'shipped':
      title = internal ? 'Order marked shipped' : 'Your order has been shipped'
      subject = internal ? `[TECHM8 Shipped] ${order.order_code}` : `Your TECHM8 order has shipped: ${order.order_code}`
      intro = internal ? `${order.order_code} has been marked shipped.` : `Hi ${customerName}, your order is on the way.`
      detail = order.tracking_number ? `Tracking number: ${order.tracking_number}` : 'Tracking details will appear in your TECHM8 account when available.'
      break
    case 'cancelled':
      title = internal ? 'Order cancelled' : 'Your order has been cancelled'
      subject = internal ? `[TECHM8 Cancelled] ${order.order_code}` : `TECHM8 order cancelled: ${order.order_code}`
      intro = internal ? `${order.order_code} has been cancelled.` : `Hi ${customerName}, your order has been cancelled.`
      detail = text(order.cancel_reason) || 'Please contact TECHM8 if you have any questions.'
      break
    case 'refunded':
      title = internal ? 'Refund completed' : 'Your refund has been processed'
      subject = internal ? `[TECHM8 Refunded] ${order.order_code}` : `TECHM8 refund processed: ${order.order_code}`
      intro = internal ? `A refund has completed for ${order.order_code}.` : `Hi ${customerName}, your refund has been processed.`
      detail = `Refund amount: ${money(refund?.amount)}. The credit note is attached.`
      break
  }

  const html = renderEmailShell(title, `
    <p style="margin:0;color:#4f6b74">${escapeHtml(intro)}</p>
    ${renderOrderTable(bundle)}
    <p style="margin:18px 0 0;color:#4f6b74">${escapeHtml(detail)}</p>
    ${internal ? '<p style="margin:18px 0 0;color:#4f6b74">Open the TECHM8 admin panel to review and process this order.</p>' : ''}
  `)
  return { subject, html }
}

async function claimNotification(
  supabaseAdmin: SupabaseAdmin,
  input: {
    orderId: number
    eventKey: string
    role: 'customer' | 'store' | 'central'
    email: string
    subject: string
  },
) {
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('order_notifications')
    .insert({
      order_id: input.orderId,
      event_key: input.eventKey,
      recipient_role: input.role,
      recipient_email: input.email,
      subject: input.subject,
      status: 'processing',
      attempt_count: 1,
    })
    .select('*')
    .single()
  if (!insertError && inserted) return { row: inserted, shouldSend: true }
  if (insertError?.code !== '23505') throw insertError

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('order_notifications')
    .select('*')
    .eq('order_id', input.orderId)
    .eq('event_key', input.eventKey)
    .eq('recipient_email', input.email)
    .single()
  if (existingError) throw existingError
  const processingIsStale = existing.status === 'processing'
    && Date.parse(String(existing.updated_at || '')) <= Date.now() - 5 * 60 * 1000
  if (existing.status === 'sent' || (existing.status === 'processing' && !processingIsStale)) {
    return { row: existing, shouldSend: false }
  }

  const { data: retryRow, error: retryError } = await supabaseAdmin
    .from('order_notifications')
    .update({
      status: 'processing',
      attempt_count: numeric(existing.attempt_count) + 1,
      last_error: null,
      subject: input.subject,
    })
    .eq('id', existing.id)
    .eq('status', existing.status)
    .eq('updated_at', existing.updated_at)
    .select('*')
    .maybeSingle()
  if (retryError) throw retryError
  if (!retryRow) return { row: existing, shouldSend: false }
  return { row: retryRow, shouldSend: true }
}

async function sendLoggedEmail(
  supabaseAdmin: SupabaseAdmin,
  input: {
    orderId: number
    eventKey: string
    role: 'customer' | 'store' | 'central'
    email: string
    subject: string
    html: string
    replyTo?: string | null
    documents?: GeneratedOrderDocument[]
  },
) {
  const email = normalizeEmail(input.email)
  if (!validEmail(email)) return { sent: false, reason: 'invalid_email' }
  const claim = await claimNotification(supabaseAdmin, { ...input, email })
  if (!claim.shouldSend) return { sent: claim.row.status === 'sent', skipped: true }

  const resendApiKey = text(Deno.env.get('RESEND_API_KEY_ORDER'))
    || text(Deno.env.get('RESEND_API_KEY_BOOKING'))
    || text(Deno.env.get('RESEND_API_KEY'))
  const fromEmail = text(Deno.env.get('ORDER_FROM_EMAIL'))
    || text(Deno.env.get('BOOKING_FROM_EMAIL'))
    || text(Deno.env.get('RESEND_FROM_EMAIL'))

  if (!resendApiKey || !fromEmail) {
    await supabaseAdmin
      .from('order_notifications')
      .update({ status: 'failed', last_error: 'Order email configuration is missing.' })
      .eq('id', claim.row.id)
    return { sent: false, reason: 'missing_email_config' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo && validEmail(input.replyTo) ? { reply_to: input.replyTo } : {}),
        ...(input.documents?.length ? {
          attachments: input.documents.map((document) => ({
            filename: document.fileName,
            content: bytesToBase64(document.bytes),
          })),
        } : {}),
      }),
    })
    const responseText = await response.text()
    if (!response.ok) throw new Error(`Resend returned ${response.status}: ${responseText}`)
    let providerMessageId: string | null = null
    try {
      providerMessageId = text(JSON.parse(responseText)?.id) || null
    } catch {
      providerMessageId = null
    }
    await supabaseAdmin
      .from('order_notifications')
      .update({
        status: 'sent',
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', claim.row.id)
    return { sent: true, providerMessageId }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await supabaseAdmin
      .from('order_notifications')
      .update({ status: 'failed', last_error: message })
      .eq('id', claim.row.id)
    console.error('Order email failed.', message)
    return { sent: false, reason: message }
  }
}

function notificationRecipients(bundle: OrderBundle) {
  const business = getBusinessProfile()
  const operationsEmail = bundle.order.fulfillment_method === 'shipping'
    ? text(bundle.issuer?.email)
    : text(bundle.store?.email)
  const candidates = [
    { role: 'customer' as const, email: text(bundle.order.email) },
    { role: 'store' as const, email: operationsEmail },
    { role: 'central' as const, email: business.centralEmail },
  ]
  const seen = new Set<string>()
  return candidates.filter((recipient) => {
    const email = normalizeEmail(recipient.email)
    if (!validEmail(email) || seen.has(email)) return false
    seen.add(email)
    recipient.email = email
    return true
  })
}

export async function notifyOrderEvent(
  supabaseAdmin: SupabaseAdmin,
  orderId: number,
  event: OrderEmailEvent,
  options: {
    sourceRef?: string | null
    refund?: RefundDocumentData | null
    resendToken?: string | null
  } = {},
) {
  const bundle = await loadOrderBundle(supabaseAdmin, orderId)
  const sourceRef = text(options.sourceRef)
  let document: GeneratedOrderDocument | null = null
  const documents: GeneratedOrderDocument[] = []
  if (event === 'order_submitted') {
    document = await ensureOrderDocument(supabaseAdmin, orderId, 'order_confirmation')
    documents.push(document)
    if (bundle.order.payment_method_code === 'pay_in_store') {
      documents.push(await ensureOrderDocument(supabaseAdmin, orderId, 'invoice'))
    }
  } else if (event === 'payment_confirmed') {
    document = await ensureOrderDocument(supabaseAdmin, orderId, 'invoice', {
      forceRegenerate: bundle.order.payment_method_code === 'pay_in_store',
    })
    documents.push(document)
  } else if (event === 'refunded') {
    document = await ensureOrderDocument(supabaseAdmin, orderId, 'credit_note', {
      sourceRef,
      refund: options.refund,
    })
    documents.push(document)
  }

  const eventKey = [event, sourceRef || 'v1', text(options.resendToken)].filter(Boolean).join(':')
  const recipients = notificationRecipients(bundle)
  const results = []
  for (const recipient of recipients) {
    const copy = emailCopy(event, bundle, recipient.role, options.refund)
    results.push(await sendLoggedEmail(supabaseAdmin, {
      orderId,
      eventKey,
      role: recipient.role,
      email: recipient.email,
      subject: copy.subject,
      html: copy.html,
      replyTo: recipient.role === 'customer' ? null : text(bundle.order.email),
      documents,
    }))
  }
  return { eventKey, document, documents, results }
}

export async function finalizePaidOrder(
  supabaseAdmin: SupabaseAdmin,
  orderId: number,
  actor: OrderActor,
  data: JsonRecord = {},
) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount, payment_status, paid_at')
    .eq('id', orderId)
    .single()
  if (orderError || !order) throw orderError ?? new Error('Order was not found.')

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'confirmed',
      fulfillment_status: 'queued',
      amount_paid: numeric(order.total_amount),
      paid_at: order.paid_at || new Date().toISOString(),
    })
    .eq('id', orderId)
  if (updateError) throw updateError

  await recordOrderEvent(supabaseAdmin, orderId, {
    eventKey: 'payment_confirmed',
    eventType: 'payment_confirmed',
    title: 'Payment confirmed',
    description: 'Payment was confirmed and the order entered the fulfilment queue.',
    actor,
    data,
  })
  await notifyOrderEvent(supabaseAdmin, orderId, 'order_submitted')
  return notifyOrderEvent(supabaseAdmin, orderId, 'payment_confirmed')
}

export async function applySucceededRefund(
  supabaseAdmin: SupabaseAdmin,
  orderId: number,
  refund: RefundDocumentData & { stripe_refund_id?: string | null },
  actor: OrderActor,
) {
  const { data: succeededRows, error: refundError } = await supabaseAdmin
    .from('order_refunds')
    .select('amount')
    .eq('order_id', orderId)
    .eq('status', 'succeeded')
  if (refundError) throw refundError
  const amountRefunded = decimal((succeededRows ?? []).reduce((sum: number, row: JsonRecord) => sum + numeric(row.amount), 0))

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount, status, fulfillment_status')
    .eq('id', orderId)
    .single()
  if (orderError || !order) throw orderError ?? new Error('Order was not found.')
  const isFullRefund = amountRefunded >= numeric(order.total_amount) - 0.005
  const canCancelFulfilment = !['shipped', 'completed'].includes(text(order.fulfillment_status))
  const patch: JsonRecord = {
    amount_refunded: amountRefunded,
    payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
    refunded_at: new Date().toISOString(),
  }
  if (isFullRefund && canCancelFulfilment) {
    patch.status = 'cancelled'
    patch.fulfillment_status = 'cancelled'
    patch.cancelled_at = new Date().toISOString()
  }
  const { error: updateError } = await supabaseAdmin.from('orders').update(patch).eq('id', orderId)
  if (updateError) throw updateError

  const sourceRef = text(refund.stripe_refund_id) || text(refund.id) || crypto.randomUUID()
  await recordOrderEvent(supabaseAdmin, orderId, {
    eventKey: `refund_succeeded:${sourceRef}`,
    eventType: 'refund_succeeded',
    title: isFullRefund ? 'Full refund completed' : 'Partial refund completed',
    description: `${money(refund.amount)} was refunded.`,
    actor,
    data: { ...refund, amount_refunded: amountRefunded },
  })
  return notifyOrderEvent(supabaseAdmin, orderId, 'refunded', {
    sourceRef,
    refund,
  })
}
