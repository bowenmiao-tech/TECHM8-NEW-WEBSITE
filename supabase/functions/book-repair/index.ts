import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const allowedCategories = new Set(['phone', 'computer', 'tablet', 'gaming_console'])
const allowedStores = new Set(['park-ridge', 'fairfield', 'north-lakes', 'toowong', 'brassall'])
const allowedContactMethods = new Set(['phone', 'email', 'sms'])

type StoreRow = {
  name?: string | null
  email?: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  suburb?: string | null
  state?: string | null
  postcode?: string | null
}

type RepairEmailPayload = {
  bookingCode: string
  storeName: string
  storeAddress: string
  customerName: string
  phone: string
  email: string
  repairCategory: string
  brand: string
  deviceModel: string
  issueDescription: string
  preferredDate: string
  preferredTime: string
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get('authorization') ?? ''
  if (!authorization.toLowerCase().startsWith('bearer ')) return ''
  return authorization.slice(7).trim()
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function prettyCategory(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatStoreAddress(store?: StoreRow | null) {
  if (!store) return ''

  return [
    store.address_line_1,
    store.address_line_2,
    [store.suburb, store.state, store.postcode].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')
}

function formatPreferredTime(preferredDate: string, preferredTime: string) {
  return [preferredDate, preferredTime].filter(Boolean).join(' · ') || 'Not specified'
}

function buildBookingRows(payload: RepairEmailPayload) {
  const device = [payload.brand, payload.deviceModel].filter(Boolean).join(' ') || payload.deviceModel
  const rows = [
    ['Booking code', payload.bookingCode],
    ['Store', payload.storeName],
    ['Store address', payload.storeAddress || 'Store address to be confirmed'],
    ['Preferred date / time', formatPreferredTime(payload.preferredDate, payload.preferredTime)],
    ['Repair category', prettyCategory(payload.repairCategory)],
    ['Device', device],
    ['Issue', payload.issueDescription],
    ['Customer', payload.customerName],
    ['Phone', payload.phone],
  ]

  if (payload.email) {
    rows.push(['Email', payload.email])
  }

  return rows
}

function renderBookingTable(payload: RepairEmailPayload) {
  return `
    <table style="border-collapse:collapse;width:100%;margin:20px 0 0">
      ${buildBookingRows(payload)
        .map(([label, value]) => `
          <tr>
            <td style="padding:11px 12px;border:1px solid #d8e7e5;background:#f4fbfa;font-weight:700;width:190px;color:#284b52">${escapeHtml(label)}</td>
            <td style="padding:11px 12px;border:1px solid #d8e7e5;color:#10242c">${escapeHtml(value)}</td>
          </tr>
        `)
        .join('')}
    </table>
  `
}

function renderEmailShell(content: string) {
  return `
    <div style="margin:0;padding:0;background:#eefaf8">
      <div style="max-width:720px;margin:0 auto;padding:28px 16px;font-family:Arial,Helvetica,sans-serif;color:#10242c;line-height:1.6">
        <div style="background:#ffffff;border:1px solid #cce8e4;border-radius:20px;overflow:hidden">
          <div style="padding:22px 26px;background:#052d32;color:#ffffff">
            <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#05ceac;font-weight:700">OZ TECH M8</div>
            <div style="font-size:22px;font-weight:800;margin-top:4px">Repair Booking</div>
          </div>
          <div style="padding:26px">
            ${content}
          </div>
        </div>
        <p style="margin:18px 0 0;color:#607981;font-size:12px;text-align:center">TECHM8 Australia · Phone, tablet, computer and game console repairs</p>
      </div>
    </div>
  `
}

async function sendEmail(payload: {
  recipients: string[]
  subject: string
  html: string
  replyTo?: string
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY_BOOKING') ?? Deno.env.get('RESEND_API_KEY') ?? ''
  const fromEmail = Deno.env.get('BOOKING_FROM_EMAIL') ?? ''
  const recipients = Array.from(
    new Set(payload.recipients.map((recipient) => recipient.trim().toLowerCase()).filter(Boolean)),
  )

  if (!resendApiKey || !fromEmail || !recipients.length) {
    return { sent: false, reason: 'missing_email_config' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipients,
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Repair booking email failed: ${errorText}`)
  }

  return { sent: true }
}

async function sendCustomerRepairConfirmationEmail(payload: RepairEmailPayload) {
  if (!payload.email || !isValidEmail(payload.email)) {
    return { sent: false, reason: 'missing_customer_email' }
  }

  const html = renderEmailShell(`
    <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;color:#10242c">Your repair booking is confirmed</h1>
    <p style="margin:0;color:#4f6b74">Thanks ${escapeHtml(payload.customerName)}. We have received your repair request and will contact you if we need more details before your visit.</p>
    ${renderBookingTable(payload)}
    <p style="margin:20px 0 0;color:#4f6b74">Please bring your device and quote your booking code when you visit the store.</p>
  `)

  return sendEmail({
    recipients: [payload.email],
    subject: `Your TECHM8 repair booking is confirmed: ${payload.bookingCode}`,
    html,
  })
}

async function sendInternalRepairNotificationEmail(payload: RepairEmailPayload & { recipients: string[] }) {
  const html = renderEmailShell(`
    <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;color:#10242c">New repair booking received</h1>
    <p style="margin:0;color:#4f6b74">A customer submitted a new repair request for <strong>${escapeHtml(payload.storeName)}</strong>.</p>
    ${renderBookingTable(payload)}
    <p style="margin:20px 0 0;color:#4f6b74">Open the admin panel to follow up and update the booking status.</p>
  `)

  return sendEmail({
    recipients: payload.recipients,
    subject: `[TECHM8 Repair] ${payload.bookingCode} - ${payload.storeName}`,
    html,
    replyTo: payload.email && isValidEmail(payload.email) ? payload.email : undefined,
  })
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

    const repairCategory = String(body.repair_category ?? '').trim()
    const storeSlug = String(body.store_slug ?? '').trim()
    const brand = String(body.brand ?? '').trim()
    const deviceModel = String(body.device_model ?? '').trim()
    const issueDescription = String(body.issue_description ?? '').trim()
    const preferredDate = String(body.preferred_date ?? '').trim()
    const preferredTime = String(body.preferred_time ?? '').trim()
    const customerName = String(body.customer_name ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const email = String(body.email ?? '').trim()
    const preferredContactMethod = String(body.preferred_contact_method ?? 'phone').trim()
    const privacyConsent = body.privacy_consent === true || body.privacy_consent === 'yes'

    if (!allowedCategories.has(repairCategory)) {
      return Response.json({ ok: false, error: 'Please select a valid repair category.' }, { status: 422, headers: corsHeaders })
    }

    if (!allowedStores.has(storeSlug)) {
      return Response.json({ ok: false, error: 'Please select a valid store.' }, { status: 422, headers: corsHeaders })
    }

    if (!deviceModel || !issueDescription || !customerName || !phone) {
      return Response.json({ ok: false, error: 'Please complete all required fields.' }, { status: 422, headers: corsHeaders })
    }

    if (email && !isValidEmail(email)) {
      return Response.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 422, headers: corsHeaders })
    }

    if (preferredContactMethod === 'email' && !email) {
      return Response.json({ ok: false, error: 'Please enter an email address or choose another contact method.' }, { status: 422, headers: corsHeaders })
    }

    if (!allowedContactMethods.has(preferredContactMethod)) {
      return Response.json({ ok: false, error: 'Please choose a valid contact method.' }, { status: 422, headers: corsHeaders })
    }

    if (!privacyConsent) {
      return Response.json({ ok: false, error: 'Please confirm the contact consent before submitting.' }, { status: 422, headers: corsHeaders })
    }

    const bookingCode = `TM8-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
          email: authUser.email ?? (email || null),
          full_name: customerName || authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
          phone: phone || authUser.user_metadata?.phone || null,
          default_store_slug: storeSlug || null,
          avatar_url: authUser.user_metadata?.avatar_url ?? null,
          provider: authUser.app_metadata?.provider ?? null,
        },
        { onConflict: 'id' },
      )
    }

    const forwardedFor = req.headers.get('x-forwarded-for')
    const userAgent = req.headers.get('user-agent')

    const { error } = await supabaseAdmin
      .from('repair_bookings')
      .insert({
        booking_code: bookingCode,
        store_slug: storeSlug,
        repair_category: repairCategory,
        brand: brand || null,
        device_model: deviceModel,
        issue_description: issueDescription,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        customer_name: customerName,
        phone,
        email: email || '',
        auth_user_id: authUser?.id ?? null,
        preferred_contact_method: preferredContactMethod,
        ip_address: forwardedFor,
        user_agent: userAgent,
      })
      .select('id, booking_code, store_slug, repair_category, brand, device_model, issue_description, preferred_date, preferred_time, customer_name, phone, email')
      .single()

    if (error) {
      console.error(error)
      return Response.json({ ok: false, error: 'Booking could not be saved.' }, { status: 500, headers: corsHeaders })
    }

    let customerEmailSent = false
    let internalEmailSent = false

    try {
      const { data: storeRow } = await supabaseAdmin
        .from('stores')
        .select('slug, name, email, address_line_1, address_line_2, suburb, state, postcode')
        .eq('slug', storeSlug)
        .maybeSingle()

      const mainNotificationEmail = String(Deno.env.get('REPAIR_NOTIFICATION_EMAIL') ?? 'techm8contact@gmail.com').trim().toLowerCase()
      const recipients = Array.from(
        new Set(
          [String(storeRow?.email ?? '').trim().toLowerCase(), mainNotificationEmail]
            .filter(Boolean),
        ),
      )
      const emailPayload = {
        bookingCode,
        storeName: String(storeRow?.name ?? storeSlug),
        storeAddress: formatStoreAddress(storeRow as StoreRow | null),
        customerName,
        phone,
        email,
        repairCategory,
        brand,
        deviceModel,
        issueDescription,
        preferredDate,
        preferredTime,
      }

      const customerResult = await sendCustomerRepairConfirmationEmail(emailPayload)
      customerEmailSent = Boolean(customerResult.sent)

      if (recipients.length) {
        const internalResult = await sendInternalRepairNotificationEmail({
          ...emailPayload,
          recipients,
        })
        internalEmailSent = Boolean(internalResult.sent)
      }
    } catch (notificationError) {
      console.error(notificationError)
    }

    return Response.json(
      {
        ok: true,
        booking_code: bookingCode,
        customer_email_sent: customerEmailSent,
        internal_email_sent: internalEmailSent,
        message: 'Your repair request has been submitted.',
      },
      { status: 200, headers: corsHeaders },
    )
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: 'Server error while processing the booking.' }, { status: 500, headers: corsHeaders })
  }
})
