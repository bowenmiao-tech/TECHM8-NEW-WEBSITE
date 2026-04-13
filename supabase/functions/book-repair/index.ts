import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const allowedCategories = new Set(['phone', 'computer', 'tablet', 'gaming_console'])
const allowedStores = new Set(['park-ridge', 'fairfield', 'north-lakes', 'toowong', 'brassall'])
const allowedContactMethods = new Set(['phone', 'email', 'sms'])

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
        preferred_contact_method: preferredContactMethod,
        ip_address: forwardedFor,
        user_agent: userAgent,
      })

    if (error) {
      console.error(error)
      return Response.json({ ok: false, error: 'Booking could not be saved.' }, { status: 500, headers: corsHeaders })
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
