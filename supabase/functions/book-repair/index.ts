import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const allowedCategories = new Set(['phone', 'computer', 'tablet', 'gaming_console'])
const allowedStores = new Set(['park-ridge', 'fairfield', 'north-lakes', 'toowong', 'brassall'])
const allowedContactMethods = new Set(['phone', 'email', 'sms'])
const centralRepairNotificationEmail = 'techm8contact@gmail.com'
const allowedPreferredTimes = new Set([
  'Morning time (9:00 AM - 12:00 PM)',
  'Lunch time (12:00 PM - 2:00 PM)',
  'Afternoon time (2:00 PM - 5:00 PM)',
])

const storeNotificationEmails: Record<string, string> = {
  'park-ridge': 'techm8.parkridge@gmail.com',
  fairfield: 'techm8.fairfield@gmail.com',
  toowong: 'techm8.toowong@gmail.com',
  'north-lakes': 'techm8.northlakes@gmail.com',
  brassall: 'techm8.brassall@gmail.com',
}

type StoreRow = {
  name?: string | null
  email?: string | null
  phone?: string | null
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
  storeMapUrl: string
  storePhone: string
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

type EmailAttachment = {
  filename: string
  content: string
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
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value.trim())
}

function normalizeEmailRecipients(recipients: string[]) {
  return Array.from(
    new Set(
      recipients
        .map((recipient) => recipient.trim().toLowerCase())
        .filter((recipient) => recipient && isValidEmail(recipient)),
    ),
  )
}

function getStoreNotificationEnvValue(storeSlug: string) {
  const suffix = storeSlug.toUpperCase().replaceAll('-', '_')
  return (
    String(Deno.env.get(`STORE_NOTIFICATION_EMAIL_${suffix}`) ?? '').trim() ||
    String(Deno.env.get(`REPAIR_NOTIFICATION_EMAIL_${suffix}`) ?? '').trim()
  )
}

function getStoreNotificationEmail(storeSlug: string, storeEmail?: string | null) {
  const candidates = [
    getStoreNotificationEnvValue(storeSlug),
    String(storeNotificationEmails[storeSlug] ?? ''),
    String(storeEmail ?? '').trim(),
  ]

  return normalizeEmailRecipients(candidates)[0] ?? ''
}

function normalizeAustralianPhone(value: string) {
  const raw = String(value || '').trim()
  const compact = raw.replace(/[^\d+]/g, '')
  const digitsOnly = raw.replace(/\D/g, '')

  if (compact.startsWith('+61')) return `+61${compact.slice(3).replace(/\D/g, '')}`
  if (compact.startsWith('61')) return `+61${compact.slice(2).replace(/\D/g, '')}`
  if (digitsOnly.startsWith('0')) return `+61${digitsOnly.slice(1)}`
  if (digitsOnly.length === 9 && /^[2-478]/.test(digitsOnly)) return `+61${digitsOnly}`

  return compact
}

function isValidAustralianPhone(value: string) {
  return /^\+61[2-478]\d{8}$/.test(normalizeAustralianPhone(value))
}

function isValidPreferredDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false
  }

  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const brisbaneToday = `${getPart('year')}-${getPart('month')}-${getPart('day')}`

  return value >= brisbaneToday
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

function buildGoogleMapsDirectionsUrl(storeName: string, storeAddress: string) {
  const destination = [storeName, storeAddress].filter(Boolean).join(', ')
  if (!destination) return ''
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

function normalizeTelHref(phone: string) {
  const value = String(phone ?? '').trim()
  if (!value) return ''

  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (value.startsWith('+')) return `+${digits}`
  if (digits.startsWith('0')) return `+61${digits.slice(1)}`
  if (digits.startsWith('61')) return `+${digits}`
  return digits
}

function getSiteUrl() {
  return String(Deno.env.get('SITE_URL') ?? 'https://www.techm8australia.com/').replace(/\/+$/, '')
}

function getLogoUrl() {
  return `${getSiteUrl()}/assets/logo-techm8.png`
}

function formatDateForCalendar(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function formatAllDayDate(year: number, month: number, day: number) {
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
}

function addDaysToDateParts(year: number, month: number, day: number, days: number) {
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function parsePreferredDateParts(preferredDate: string) {
  const match = String(preferredDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function parsePreferredTimeParts(preferredTime: string) {
  const value = String(preferredTime || '').trim().toLowerCase()
  const match = value.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/)
  if (!match) return null

  let hour = Number(match[1])
  const minute = Number(match[2] ?? '0')
  const period = match[3]
  if (hour > 23 || minute > 59) return null
  if (period === 'pm' && hour < 12) hour += 12
  if (period === 'am' && hour === 12) hour = 0
  return { hour, minute }
}

function buildCalendarDetails(payload: RepairEmailPayload) {
  return [
    `Booking code: ${payload.bookingCode}`,
    `Store: ${payload.storeName}`,
    `Store phone: ${payload.storePhone || 'Not specified'}`,
    `Repair category: ${prettyCategory(payload.repairCategory)}`,
    `Device: ${[payload.brand, payload.deviceModel].filter(Boolean).join(' ') || payload.deviceModel}`,
    `Issue: ${payload.issueDescription}`,
    `Customer: ${payload.customerName}`,
    `Customer phone: ${payload.phone}`,
    payload.email ? `Customer email: ${payload.email}` : '',
    '',
    'Please bring your device and quote your booking code when you visit the store.',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

function toBase64(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function buildCalendarInvite(payload: RepairEmailPayload) {
  const dateParts = parsePreferredDateParts(payload.preferredDate)
  if (!dateParts) return null

  const title = `TECHM8 Repair Booking - ${payload.storeName}`
  const location = payload.storeAddress || payload.storeName
  const details = buildCalendarDetails(payload)
  const timeParts = parsePreferredTimeParts(payload.preferredTime)
  let googleDates = ''
  let icsDates = ''

  if (timeParts) {
    // Australia/Brisbane is UTC+10 year-round.
    const start = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, timeParts.hour - 10, timeParts.minute))
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    googleDates = `${formatDateForCalendar(start)}/${formatDateForCalendar(end)}`
    icsDates = `DTSTART:${formatDateForCalendar(start)}\r\nDTEND:${formatDateForCalendar(end)}`
  } else {
    const startDate = formatAllDayDate(dateParts.year, dateParts.month, dateParts.day)
    const endParts = addDaysToDateParts(dateParts.year, dateParts.month, dateParts.day, 1)
    const endDate = formatAllDayDate(endParts.year, endParts.month, endParts.day)
    googleDates = `${startDate}/${endDate}`
    icsDates = `DTSTART;VALUE=DATE:${startDate}\r\nDTEND;VALUE=DATE:${endDate}`
  }

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${encodeURIComponent(googleDates)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TECHM8//Repair Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${payload.bookingCode}@techm8australia.com`,
    `DTSTAMP:${formatDateForCalendar(new Date())}`,
    icsDates,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${details.replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return {
    googleUrl,
    attachment: {
      filename: `techm8-repair-booking-${payload.bookingCode}.ics`,
      content: toBase64(ics),
    },
  }
}

function renderCalendarBlock(payload: RepairEmailPayload) {
  const invite = buildCalendarInvite(payload)
  if (!invite) return ''

  return `
    <div style="margin:18px 0 0;padding:16px;border:1px solid #bfeae5;background:#f2fffd;border-radius:14px">
      <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#008f83;font-weight:800">Calendar reminder</div>
      <p style="margin:6px 0 14px;color:#284b52">Add this repair booking to your calendar so you do not miss your visit.</p>
      <a href="${escapeHtml(invite.googleUrl)}" style="display:inline-block;background:#05ceac;color:#052d32;font-weight:800;text-decoration:none;padding:11px 16px;border-radius:999px">Add to Google Calendar</a>
      <p style="margin:12px 0 0;color:#607981;font-size:12px">An .ics calendar file is also attached for Apple Calendar and Outlook.</p>
    </div>
  `
}

type BookingRow = {
  label: string
  value: string
  html?: string
}

function buildBookingRows(payload: RepairEmailPayload) {
  const device = [payload.brand, payload.deviceModel].filter(Boolean).join(' ') || payload.deviceModel
  const storeAddress = payload.storeAddress || 'Store address to be confirmed'
  const storePhone = payload.storePhone || 'Store phone to be confirmed'
  const storePhoneHref = normalizeTelHref(payload.storePhone)
  const rows: BookingRow[] = [
    { label: 'Booking code', value: payload.bookingCode },
    { label: 'Store', value: payload.storeName },
    {
      label: 'Store address',
      value: storeAddress,
      html: payload.storeMapUrl
        ? `<a href="${escapeHtml(payload.storeMapUrl)}" style="color:#008f83;font-weight:700;text-decoration:underline">${escapeHtml(storeAddress)}</a>`
        : escapeHtml(storeAddress),
    },
    {
      label: 'Store phone',
      value: storePhone,
      html: storePhoneHref
        ? `<a href="tel:${escapeHtml(storePhoneHref)}" style="color:#008f83;font-weight:700;text-decoration:underline">${escapeHtml(storePhone)}</a>`
        : escapeHtml(storePhone),
    },
    { label: 'Preferred date / time', value: formatPreferredTime(payload.preferredDate, payload.preferredTime) },
    { label: 'Repair category', value: prettyCategory(payload.repairCategory) },
    { label: 'Device', value: device },
    { label: 'Issue', value: payload.issueDescription },
    { label: 'Customer', value: payload.customerName },
    { label: 'Phone', value: payload.phone },
  ]

  if (payload.email) {
    rows.push({ label: 'Email', value: payload.email })
  }

  return rows
}

function renderBookingTable(payload: RepairEmailPayload) {
  return `
    <table style="border-collapse:collapse;width:100%;margin:20px 0 0">
      ${buildBookingRows(payload)
        .map((row) => `
          <tr>
            <td style="padding:11px 12px;border:1px solid #d8e7e5;background:#f4fbfa;font-weight:700;width:190px;color:#284b52">${escapeHtml(row.label)}</td>
            <td style="padding:11px 12px;border:1px solid #d8e7e5;color:#10242c">${row.html ?? escapeHtml(row.value)}</td>
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
            <img src="${escapeHtml(getLogoUrl())}" alt="TECHM8" width="180" style="display:block;width:180px;max-width:70%;height:auto;margin:0 0 16px">
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
  attachments?: EmailAttachment[]
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY_BOOKING') ?? Deno.env.get('RESEND_API_KEY') ?? ''
  const fromEmail = Deno.env.get('BOOKING_FROM_EMAIL') ?? ''
  const recipients = normalizeEmailRecipients(payload.recipients)

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
      ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
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

  const calendarInvite = buildCalendarInvite(payload)
  const html = renderEmailShell(`
    <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;color:#10242c">Your repair booking is confirmed</h1>
    <p style="margin:0;color:#4f6b74">Thanks ${escapeHtml(payload.customerName)}. We have received your repair request and will contact you if we need more details before your visit.</p>
    ${renderBookingTable(payload)}
    ${renderCalendarBlock(payload)}
    <p style="margin:20px 0 0;color:#4f6b74">Please bring your device and quote your booking code when you visit the store.</p>
  `)

  return sendEmail({
    recipients: [payload.email],
    subject: `Your TECHM8 repair booking is confirmed: ${payload.bookingCode}`,
    html,
    attachments: calendarInvite ? [calendarInvite.attachment] : undefined,
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
    const phone = normalizeAustralianPhone(String(body.phone ?? '').trim())
    const email = String(body.email ?? '').trim().toLowerCase()
    const preferredContactMethod = String(body.preferred_contact_method ?? 'phone').trim()
    const privacyConsent = body.privacy_consent === true || body.privacy_consent === 'yes'

    if (!allowedCategories.has(repairCategory)) {
      return Response.json({ ok: false, error: 'Please select a valid repair category.' }, { status: 422, headers: corsHeaders })
    }

    if (!allowedStores.has(storeSlug)) {
      return Response.json({ ok: false, error: 'Please select a valid store.' }, { status: 422, headers: corsHeaders })
    }

    if (!deviceModel || !issueDescription || !preferredDate || !preferredTime || !customerName || !phone || !email) {
      return Response.json({ ok: false, error: 'Please complete all required fields.' }, { status: 422, headers: corsHeaders })
    }

    if (!isValidPreferredDate(preferredDate)) {
      return Response.json({ ok: false, error: 'Please enter a valid preferred date.' }, { status: 422, headers: corsHeaders })
    }

    if (!allowedPreferredTimes.has(preferredTime)) {
      return Response.json({ ok: false, error: 'Please choose a valid preferred time.' }, { status: 422, headers: corsHeaders })
    }

    if (!isValidAustralianPhone(phone)) {
      return Response.json({ ok: false, error: 'Please enter a valid Australian phone number.' }, { status: 422, headers: corsHeaders })
    }

    if (!isValidEmail(email)) {
      return Response.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 422, headers: corsHeaders })
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
        .select('slug, name, email, phone, address_line_1, address_line_2, suburb, state, postcode')
        .eq('slug', storeSlug)
        .maybeSingle()

      const mainNotificationEmail = String(Deno.env.get('REPAIR_NOTIFICATION_EMAIL') ?? '').trim().toLowerCase()
      const storeNotificationEmail = getStoreNotificationEmail(storeSlug, storeRow?.email)
      const recipients = normalizeEmailRecipients([storeNotificationEmail, centralRepairNotificationEmail, mainNotificationEmail])
      const storeName = String(storeRow?.name ?? storeSlug)
      const storeAddress = formatStoreAddress(storeRow as StoreRow | null)
      const emailPayload = {
        bookingCode,
        storeName,
        storeAddress,
        storeMapUrl: buildGoogleMapsDirectionsUrl(storeName, storeAddress),
        storePhone: String(storeRow?.phone ?? '').trim(),
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

      const internalResult = await sendInternalRepairNotificationEmail({
        ...emailPayload,
        recipients,
      })
      internalEmailSent = Boolean(internalResult.sent)
      if (!internalEmailSent) {
        throw new Error(`Internal repair notification was not sent: ${internalResult.reason ?? 'unknown_reason'}`)
      }

      try {
        const customerResult = await sendCustomerRepairConfirmationEmail(emailPayload)
        customerEmailSent = Boolean(customerResult.sent)
      } catch (customerNotificationError) {
        console.error(customerNotificationError)
      }
    } catch (notificationError) {
      console.error(notificationError)
      return Response.json(
        {
          ok: false,
          booking_code: bookingCode,
          customer_email_sent: customerEmailSent,
          internal_email_sent: false,
          error: 'Booking was saved, but the store notification email could not be sent.',
        },
        { status: 502, headers: corsHeaders },
      )
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
