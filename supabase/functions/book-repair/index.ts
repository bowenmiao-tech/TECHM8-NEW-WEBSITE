import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const allowedCategories = new Set(['phone', 'computer', 'tablet', 'gaming_console'])
const allowedStores = new Set(['park-ridge', 'fairfield', 'north-lakes', 'toowong', 'brassall'])
const allowedContactMethods = new Set(['phone', 'email', 'sms'])

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

async function sendRepairBookingNotificationEmail(payload: {
  recipients: string[]
  bookingCode: string
  storeName: string
  customerName: string
  phone: string
  email: string
  repairCategory: string
  brand: string
  deviceModel: string
  issueDescription: string
  preferredDate: string
  preferredTime: string
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  const fromEmail = Deno.env.get('BOOKING_FROM_EMAIL') ?? ''

  if (!resendApiKey || !fromEmail || !payload.recipients.length) {
    return { sent: false, reason: 'missing_email_config' }
  }

  const prettyCategory = payload.repairCategory.replaceAll('_', ' ')
  const subject = `[TECHM8 Repair] ${payload.bookingCode} - ${payload.storeName}`
  const html = `
    <div style="font-family:Arial,sans-serif;color:#10242c;line-height:1.6">
      <h2 style="margin:0 0 12px">New repair booking received</h2>
      <p style="margin:0 0 16px">A customer has submitted a new repair request for <strong>${escapeHtml(payload.storeName)}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;max-width:720px">
        <tr><td style="padding:8px 10px;border:1px solid #d9e4e7;font-weight:700">Booking code</td><td style="padding:8px 10px;border:1px solid #d9e4e7">${escapeHtml(payload.bookingCode)}</td></tr>
        <tr><td style="padding:8px 10px;border:1px solid #d9e4e7;font-weight:700">Customer</td><td style="padding:8px 10px;border:1px solid #d9e4e7">${escapeHtml(payload.customerName)}</td></tr>
        <tr><td style="padding:8px 10px;border:1px solid #d9e4e7;font-weight:700">Phone</td><td style="padding:8px 10px;border:1px solid #d9e4e7">${escapeHtml(payload.phone)}</td></tr>
        <tr><td style="padding:8px 10px;border:1px solid #d9e4e7;font-weight:700">Email</td><td style="padding:8px 10px;border:1px solid #d9e4e7">${escapeHtml(payload.email)}</td></tr>
        <tr><td style="padding:8px 10px;border:1px solid #d9e4e7;font-weight:700">Category</td><td style="padding:8px 10px;border:1px solid #d9e4e7">${escapeHtml(prettyCategory)}</td></tr>
        <tr><td style="padding:8px 10px;border:1px solid #d9e4e7;font-weight:700">Device</td><td style="padding:8px 10px;border:1px solid #d9e4e7">${escapeHtml([payload.brand, payload.deviceModel].filter(Boolean).join(' ') || payload.deviceModel)}</td></tr>
        <tr><td style="padding:8px 10px;border:1px solid #d9e4e7;font-weight:700">Preferred time</td><td style="padding:8px 10px;border:1px solid #d9e4e7">${escapeHtml([payload.preferredDate, payload.preferredTime].filter(Boolean).join(' · ') || 'Not specified')}</td></tr>
        <tr><td style="padding:8px 10px;border:1px solid #d9e4e7;font-weight:700">Issue</td><td style="padding:8px 10px;border:1px solid #d9e4e7">${escapeHtml(payload.issueDescription)}</td></tr>
      </table>
      <p style="margin:16px 0 0;color:#4f6b74">Open the admin panel to follow up and update the booking status.</p>
    </div>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: payload.recipients,
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Repair notification email failed: ${errorText}`)
  }

  return { sent: true }
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

    if (!deviceModel || !issueDescription || !customerName || !phone || !email) {
      return Response.json({ ok: false, error: 'Please complete all required fields.' }, { status: 422, headers: corsHeaders })
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
        email,
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

    try {
      const { data: storeRow } = await supabaseAdmin
        .from('stores')
        .select('slug, name, email')
        .eq('slug', storeSlug)
        .maybeSingle()

      const mainNotificationEmail = String(Deno.env.get('REPAIR_NOTIFICATION_EMAIL') ?? 'techm8contact@gmail.com').trim().toLowerCase()
      const recipients = Array.from(
        new Set(
          [String(storeRow?.email ?? '').trim().toLowerCase(), mainNotificationEmail]
            .filter(Boolean),
        ),
      )

      if (recipients.length) {
        await sendRepairBookingNotificationEmail({
          recipients,
          bookingCode,
          storeName: String(storeRow?.name ?? storeSlug),
          customerName,
          phone,
          email,
          repairCategory,
          brand,
          deviceModel,
          issueDescription,
          preferredDate,
          preferredTime,
        })
      }
    } catch (notificationError) {
      console.error(notificationError)
    }

    return Response.json(
      {
        ok: true,
        booking_code: bookingCode,
        message: 'Your repair request has been submitted.',
      },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: 'Server error while processing the booking.' }, { status: 500, headers: corsHeaders })
  }
})
