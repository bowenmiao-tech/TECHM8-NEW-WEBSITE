import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const centralCareersNotificationEmail = 'techm8contact@gmail.com'
const resumeBucket = 'job-applications'
const maxResumeBytes = 5 * 1024 * 1024

const storeLabels: Record<string, string> = {
  'park-ridge': 'Park Ridge',
  fairfield: 'Fairfield',
  toowong: 'Toowong',
  'north-lakes': 'North Lakes',
  brassall: 'Brassall',
  any: 'Any store / flexible',
}

const storeNotificationEmails: Record<string, string> = {
  'park-ridge': 'techm8.parkridge@gmail.com',
  fairfield: 'techm8.fairfield@gmail.com',
  toowong: 'techm8.toowong@gmail.com',
  'north-lakes': 'techm8.northlakes@gmail.com',
  brassall: 'techm8.brassall@gmail.com',
}

// Australian work eligibility, following the Home Affairs subclass naming used
// across Seek / SmartRecruiters style applications.
const workRightsLabels: Record<string, string> = {
  australian_citizen: 'Australian Citizen',
  nz_citizen: 'New Zealand Citizen (Subclass 444)',
  permanent_resident: 'Australian Permanent Resident',
  student_500: 'Student Visa (Subclass 500)',
  working_holiday_417_462: 'Working Holiday Visa (Subclass 417 / 462)',
  graduate_485: 'Temporary Graduate Visa (Subclass 485)',
  skills_in_demand_482: 'Skills in Demand / TSS Visa (Subclass 482)',
  partner_visa: 'Partner Visa (Subclass 820/801 or 309/100)',
  bridging_visa: 'Bridging Visa',
  other_visa: 'Other visa with work rights',
  needs_sponsorship: 'No current work rights - sponsorship required',
}

// Statuses that carry a visa expiry and, usually, a condition on hours worked.
const temporaryVisaStatuses = new Set([
  'student_500',
  'working_holiday_417_462',
  'graduate_485',
  'skills_in_demand_482',
  'partner_visa',
  'bridging_visa',
  'other_visa',
])

const transportLabels: Record<string, string> = {
  own_car: 'Yes - own car',
  motorbike_scooter: 'Yes - motorbike or scooter',
  public_transport: 'No - travels by public transport',
  lift_or_walk: 'No - walks, cycles or gets a lift',
  can_arrange: 'Not yet - can arrange reliable transport',
}

const licenceLabels: Record<string, string> = {
  full: 'Full (Open) Australian licence',
  provisional: 'Provisional (P1 / P2)',
  learner: 'Learner permit',
  international: 'Overseas / international licence',
  none: 'No licence',
}

const employmentTypeLabels: Record<string, string> = {
  casual: 'Casual',
  part_time: 'Part time',
  full_time: 'Full time',
  any: 'Any / flexible',
}

const roleLabels: Record<string, string> = {
  retail_sales: 'Retail Sales & Customer Service',
  repair_technician: 'Repair Technician',
  computer_it: 'Computer & IT Support',
  warehouse_logistics: 'Warehouse & Logistics',
  store_management: 'Store Management',
  admin_office: 'Admin & Support Office',
}

const availabilityLabels: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const allowedResumeTypes: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/rtf': 'rtf',
  'text/plain': 'txt',
}

type EmailAttachment = {
  filename: string
  content: string
}

type ApplicationPayload = {
  referenceCode: string
  storeSlug: string
  storeLabel: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  suburb: string
  postcode: string
  workRights: string
  visaSubclass: string
  visaExpiry: string
  workHoursLimit: string
  ownTransport: string
  driversLicence: string
  employmentType: string
  roleInterest: string[]
  availability: string[]
  earliestStart: string
  experienceSummary: string
  resumeFilename: string
  source: string
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

function isValidIsoDate(value: string) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function toStringArray(value: unknown, allowed: Record<string, string>) {
  const raw = Array.isArray(value)
    ? value
    : String(value ?? '')
        .split(',')
        .map((entry) => entry.trim())

  return Array.from(
    new Set(
      raw
        .map((entry) => String(entry ?? '').trim())
        .filter((entry) => entry && Object.hasOwn(allowed, entry)),
    ),
  )
}

function labelList(values: string[], labels: Record<string, string>) {
  return values.map((value) => labels[value] ?? value).join(', ')
}

function getSiteUrl() {
  return String(Deno.env.get('SITE_URL') ?? 'https://www.techm8australia.com/').replace(/\/+$/, '')
}

function getLogoUrl() {
  return `${getSiteUrl()}/assets/logo-techm8.png`
}

function formatAustralianDate(value: string) {
  if (!isValidIsoDate(value)) return value
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function slugifyForFilename(value: string) {
  return (
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'applicant'
  )
}

function base64ToBytes(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

type ResumeInput = {
  base64: string
  bytes: Uint8Array
  filename: string
  mimeType: string
  extension: string
}

function parseResume(raw: unknown): { resume?: ResumeInput; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Please attach your resume.' }
  }

  const record = raw as Record<string, unknown>
  const mimeType = String(record.mime_type ?? '').trim().toLowerCase()
  const extension = allowedResumeTypes[mimeType]

  if (!extension) {
    return { error: 'Resume must be a PDF, Word, RTF or plain text document.' }
  }

  // The browser sends a data URL; strip the prefix before decoding.
  const base64 = String(record.data ?? '').replace(/^data:[^;]*;base64,/, '').trim()
  if (!base64) {
    return { error: 'Resume file could not be read. Please try attaching it again.' }
  }

  let bytes: Uint8Array
  try {
    bytes = base64ToBytes(base64)
  } catch {
    return { error: 'Resume file could not be read. Please try attaching it again.' }
  }

  if (!bytes.length) {
    return { error: 'Resume file is empty. Please attach a different file.' }
  }

  if (bytes.length > maxResumeBytes) {
    return { error: 'Resume must be 5 MB or smaller.' }
  }

  const filename = String(record.filename ?? '').trim().slice(0, 160) || `resume.${extension}`

  return { resume: { base64, bytes, filename, mimeType, extension } }
}

type ApplicationRow = {
  label: string
  value: string
}

function buildApplicationRows(payload: ApplicationPayload): ApplicationRow[] {
  const rows: ApplicationRow[] = [
    { label: 'Reference', value: payload.referenceCode },
    { label: 'Preferred store', value: payload.storeLabel },
    { label: 'Applicant', value: payload.fullName },
    { label: 'Email', value: payload.email },
    { label: 'Phone', value: payload.phone },
  ]

  const location = [payload.suburb, payload.postcode].filter(Boolean).join(' ')
  if (location) rows.push({ label: 'Location', value: location })

  rows.push({
    label: 'Work rights',
    value: workRightsLabels[payload.workRights] ?? payload.workRights,
  })

  if (payload.visaSubclass) rows.push({ label: 'Visa subclass', value: payload.visaSubclass })
  if (payload.visaExpiry) {
    rows.push({ label: 'Visa expiry', value: formatAustralianDate(payload.visaExpiry) })
  }
  if (payload.workHoursLimit) {
    rows.push({ label: 'Work hours condition', value: payload.workHoursLimit })
  }

  rows.push(
    { label: 'Own transport', value: transportLabels[payload.ownTransport] ?? payload.ownTransport },
    {
      label: 'Driver licence',
      value: licenceLabels[payload.driversLicence] ?? payload.driversLicence,
    },
    {
      label: 'Roles of interest',
      value: labelList(payload.roleInterest, roleLabels) || 'Not specified',
    },
    {
      label: 'Employment type',
      value: employmentTypeLabels[payload.employmentType] ?? payload.employmentType,
    },
    {
      label: 'Availability',
      value: labelList(payload.availability, availabilityLabels) || 'Not specified',
    },
  )

  if (payload.earliestStart) rows.push({ label: 'Earliest start', value: payload.earliestStart })
  if (payload.experienceSummary) {
    rows.push({ label: 'About the applicant', value: payload.experienceSummary })
  }

  rows.push({ label: 'Resume', value: payload.resumeFilename || 'Not attached' })
  if (payload.source) rows.push({ label: 'Applied via', value: payload.source })

  return rows
}

function renderApplicationTable(payload: ApplicationPayload) {
  return `
    <table style="border-collapse:collapse;width:100%;margin:20px 0 0">
      ${buildApplicationRows(payload)
        .map(
          (row) => `
          <tr>
            <td style="padding:11px 12px;border:1px solid #d8e7e5;background:#f4fbfa;font-weight:700;width:190px;color:#284b52">${escapeHtml(row.label)}</td>
            <td style="padding:11px 12px;border:1px solid #d8e7e5;color:#10242c">${escapeHtml(row.value)}</td>
          </tr>
        `,
        )
        .join('')}
    </table>
  `
}

function renderEmailShell(heading: string, content: string) {
  return `
    <div style="margin:0;padding:0;background:#eefaf8">
      <div style="max-width:720px;margin:0 auto;padding:28px 16px;font-family:Arial,Helvetica,sans-serif;color:#10242c;line-height:1.6">
        <div style="background:#ffffff;border:1px solid #cce8e4;border-radius:20px;overflow:hidden">
          <div style="padding:22px 26px;background:#052d32;color:#ffffff">
            <img src="${escapeHtml(getLogoUrl())}" alt="TECHM8" width="180" style="display:block;width:180px;max-width:70%;height:auto;margin:0 0 16px">
            <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#05ceac;font-weight:700">OZ TECH M8 CAREERS</div>
            <div style="font-size:22px;font-weight:800;margin-top:4px">${escapeHtml(heading)}</div>
          </div>
          <div style="padding:26px">
            ${content}
          </div>
        </div>
        <p style="margin:18px 0 0;color:#607981;font-size:12px;text-align:center">TECHM8 Australia &middot; Phone, tablet, computer and game console repairs</p>
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
  const fromEmail = Deno.env.get('CAREERS_FROM_EMAIL') ?? Deno.env.get('BOOKING_FROM_EMAIL') ?? ''
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
    throw new Error(`Job application email failed: ${errorText}`)
  }

  return { sent: true }
}

async function sendInternalApplicationEmail(
  payload: ApplicationPayload & {
    recipients: string[]
    attachments: EmailAttachment[]
    resumeUrl: string
  },
) {
  const resumeBlock = payload.resumeUrl
    ? `<p style="margin:18px 0 0;color:#4f6b74">The resume is attached and also stored securely. <a href="${escapeHtml(payload.resumeUrl)}" style="color:#008f83;font-weight:700;text-decoration:underline">Open the stored copy</a> (link valid for 7 days).</p>`
    : '<p style="margin:18px 0 0;color:#4f6b74">The resume is attached to this email.</p>'

  const html = renderEmailShell(
    'New job application',
    `
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;color:#10242c">New application for ${escapeHtml(payload.storeLabel)}</h1>
      <p style="margin:0;color:#4f6b74"><strong>${escapeHtml(payload.fullName)}</strong> applied to work at TECHM8. Reply to this email to contact the applicant directly.</p>
      ${renderApplicationTable(payload)}
      ${resumeBlock}
    `,
  )

  return sendEmail({
    recipients: payload.recipients,
    subject: `[TECHM8 Careers] ${payload.fullName} - ${payload.storeLabel} (${payload.referenceCode})`,
    html,
    replyTo: payload.email,
    attachments: payload.attachments,
  })
}

async function sendApplicantConfirmationEmail(payload: ApplicationPayload) {
  const html = renderEmailShell(
    'Application received',
    `
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;color:#10242c">Thanks ${escapeHtml(payload.firstName)}, we have your application</h1>
      <p style="margin:0;color:#4f6b74">Your application to join the TECHM8 team at <strong>${escapeHtml(payload.storeLabel)}</strong> has been received. Our team reviews every application and will be in touch if there is a good match, either now or when a role opens up.</p>
      <div style="margin:20px 0 0;padding:16px;border:1px solid #bfeae5;background:#f2fffd;border-radius:14px">
        <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#008f83;font-weight:800">Your reference</div>
        <div style="font-size:24px;font-weight:800;color:#10242c;margin-top:4px;letter-spacing:.04em">${escapeHtml(payload.referenceCode)}</div>
        <p style="margin:8px 0 0;color:#284b52;font-size:14px">Quote this reference if you contact us about your application.</p>
      </div>
      ${renderApplicationTable(payload)}
      <p style="margin:20px 0 0;color:#4f6b74">If anything above is wrong, just reply to this email and we will update it.</p>
      <p style="margin:16px 0 0"><a href="${escapeHtml(getSiteUrl())}/stores.html" style="display:inline-block;background:#05ceac;color:#052d32;font-weight:800;text-decoration:none;padding:11px 18px;border-radius:999px">Find your nearest store</a></p>
    `,
  )

  return sendEmail({
    recipients: [payload.email],
    subject: `We received your TECHM8 application (${payload.referenceCode})`,
    html,
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

    const storeSlug = String(body.store_slug ?? '').trim()
    const firstName = String(body.first_name ?? '').trim().slice(0, 80)
    const lastName = String(body.last_name ?? '').trim().slice(0, 80)
    const email = String(body.email ?? '').trim().toLowerCase()
    const phone = normalizeAustralianPhone(String(body.phone ?? '').trim())
    const suburb = String(body.suburb ?? '').trim().slice(0, 120)
    const postcode = String(body.postcode ?? '').trim().slice(0, 10)
    const workRights = String(body.work_rights ?? '').trim()
    const visaSubclass = String(body.visa_subclass ?? '').trim().slice(0, 60)
    const visaExpiry = String(body.visa_expiry ?? '').trim()
    const workHoursLimit = String(body.work_hours_limit ?? '').trim().slice(0, 120)
    const ownTransport = String(body.own_transport ?? '').trim()
    const driversLicence = String(body.drivers_licence ?? '').trim()
    const employmentType = String(body.employment_type ?? '').trim()
    const earliestStart = String(body.earliest_start ?? '').trim().slice(0, 80)
    const experienceSummary = String(body.experience_summary ?? '').trim().slice(0, 4000)
    const source = String(body.source ?? '').trim().slice(0, 120)
    const privacyConsent = body.privacy_consent === true || body.privacy_consent === 'yes'

    const roleInterest = toStringArray(body.role_interest, roleLabels)
    const availability = toStringArray(body.availability, availabilityLabels)

    if (!Object.hasOwn(storeLabels, storeSlug)) {
      return Response.json({ ok: false, error: 'Please choose where you would like to work.' }, { status: 422, headers: corsHeaders })
    }

    if (!firstName || !lastName) {
      return Response.json({ ok: false, error: 'Please enter your first and last name.' }, { status: 422, headers: corsHeaders })
    }

    if (!isValidEmail(email)) {
      return Response.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 422, headers: corsHeaders })
    }

    if (!isValidAustralianPhone(phone)) {
      return Response.json({ ok: false, error: 'Please enter a valid Australian phone number.' }, { status: 422, headers: corsHeaders })
    }

    if (!Object.hasOwn(workRightsLabels, workRights)) {
      return Response.json({ ok: false, error: 'Please select your right to work in Australia.' }, { status: 422, headers: corsHeaders })
    }

    if (temporaryVisaStatuses.has(workRights) && !visaSubclass) {
      return Response.json({ ok: false, error: 'Please enter your visa subclass number.' }, { status: 422, headers: corsHeaders })
    }

    if (visaExpiry && !isValidIsoDate(visaExpiry)) {
      return Response.json({ ok: false, error: 'Please enter a valid visa expiry date.' }, { status: 422, headers: corsHeaders })
    }

    if (!Object.hasOwn(transportLabels, ownTransport)) {
      return Response.json({ ok: false, error: 'Please tell us about your transport to work.' }, { status: 422, headers: corsHeaders })
    }

    if (!Object.hasOwn(licenceLabels, driversLicence)) {
      return Response.json({ ok: false, error: 'Please select your driver licence status.' }, { status: 422, headers: corsHeaders })
    }

    if (!Object.hasOwn(employmentTypeLabels, employmentType)) {
      return Response.json({ ok: false, error: 'Please select the type of work you are looking for.' }, { status: 422, headers: corsHeaders })
    }

    if (!roleInterest.length) {
      return Response.json({ ok: false, error: 'Please choose at least one role you are interested in.' }, { status: 422, headers: corsHeaders })
    }

    if (!privacyConsent) {
      return Response.json({ ok: false, error: 'Please confirm the privacy consent before submitting.' }, { status: 422, headers: corsHeaders })
    }

    const { resume, error: resumeError } = parseResume(body.resume)
    if (!resume) {
      return Response.json({ ok: false, error: resumeError ?? 'Please attach your resume.' }, { status: 422, headers: corsHeaders })
    }

    const referenceCode = `TM8-JOB-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
    const fullName = `${firstName} ${lastName}`.trim()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Store the resume before the row is written so a saved application never
    // points at a missing object.
    const resumePath = `${storeSlug}/${referenceCode}-${slugifyForFilename(fullName)}.${resume.extension}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from(resumeBucket)
      .upload(resumePath, resume.bytes, {
        contentType: resume.mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error(uploadError)
      return Response.json({ ok: false, error: 'Your resume could not be uploaded. Please try again.' }, { status: 500, headers: corsHeaders })
    }

    const forwardedFor = req.headers.get('x-forwarded-for')
    const userAgent = req.headers.get('user-agent')

    const { error: insertError } = await supabaseAdmin.from('job_applications').insert({
      reference_code: referenceCode,
      store_slug: storeSlug,
      role_interest: roleInterest,
      employment_type: employmentType,
      availability,
      earliest_start: earliestStart || null,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      suburb: suburb || null,
      postcode: postcode || null,
      work_rights: workRights,
      visa_subclass: visaSubclass || null,
      visa_expiry: visaExpiry || null,
      work_hours_limit: workHoursLimit || null,
      own_transport: ownTransport,
      drivers_licence: driversLicence,
      experience_summary: experienceSummary || null,
      resume_path: resumePath,
      resume_filename: resume.filename,
      resume_mime_type: resume.mimeType,
      resume_size_bytes: resume.bytes.length,
      source: source || null,
      ip_address: forwardedFor,
      user_agent: userAgent,
    })

    if (insertError) {
      console.error(insertError)
      await supabaseAdmin.storage.from(resumeBucket).remove([resumePath])
      return Response.json({ ok: false, error: 'Your application could not be saved. Please try again.' }, { status: 500, headers: corsHeaders })
    }

    const emailPayload: ApplicationPayload = {
      referenceCode,
      storeSlug,
      storeLabel: storeLabels[storeSlug],
      firstName,
      lastName,
      fullName,
      email,
      phone,
      suburb,
      postcode,
      workRights,
      visaSubclass,
      visaExpiry,
      workHoursLimit,
      ownTransport,
      driversLicence,
      employmentType,
      roleInterest,
      availability,
      earliestStart,
      experienceSummary,
      resumeFilename: resume.filename,
      source,
    }

    let applicantEmailSent = false
    let internalEmailSent = false

    try {
      const { data: signedUrl } = await supabaseAdmin.storage
        .from(resumeBucket)
        .createSignedUrl(resumePath, 60 * 60 * 24 * 7)

      const recipients = normalizeEmailRecipients([
        centralCareersNotificationEmail,
        String(Deno.env.get('CAREERS_NOTIFICATION_EMAIL') ?? ''),
        storeSlug === 'any' ? '' : String(storeNotificationEmails[storeSlug] ?? ''),
      ])

      const internalResult = await sendInternalApplicationEmail({
        ...emailPayload,
        recipients,
        resumeUrl: signedUrl?.signedUrl ?? '',
        attachments: [{ filename: resume.filename, content: resume.base64 }],
      })

      internalEmailSent = Boolean(internalResult.sent)
      if (!internalEmailSent) {
        throw new Error(
          `Internal careers notification was not sent: ${internalResult.reason ?? 'unknown_reason'}`,
        )
      }

      try {
        const applicantResult = await sendApplicantConfirmationEmail(emailPayload)
        applicantEmailSent = Boolean(applicantResult.sent)
      } catch (applicantNotificationError) {
        console.error(applicantNotificationError)
      }
    } catch (notificationError) {
      console.error(notificationError)
      return Response.json(
        {
          ok: false,
          reference_code: referenceCode,
          applicant_email_sent: applicantEmailSent,
          internal_email_sent: false,
          error:
            'Your application was saved, but the notification email could not be sent. Please call your nearest store to confirm.',
        },
        { status: 502, headers: corsHeaders },
      )
    }

    return Response.json(
      {
        ok: true,
        reference_code: referenceCode,
        applicant_email_sent: applicantEmailSent,
        internal_email_sent: internalEmailSent,
        message: 'Your application has been submitted.',
      },
      { status: 200, headers: corsHeaders },
    )
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: 'Server error while processing your application.' }, { status: 500, headers: corsHeaders })
  }
})
