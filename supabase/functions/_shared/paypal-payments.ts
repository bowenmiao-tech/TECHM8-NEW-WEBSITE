export type PayPalEnvironment = 'sandbox' | 'production'
export type PayPalJson = Record<string, unknown>

const PAYPAL_BASE_URLS: Record<PayPalEnvironment, string> = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  production: 'https://api-m.paypal.com',
}

const PAYPAL_RETRY_SCHEDULE = [
  { delayBeforeMs: 0, timeoutMs: 20000 },
  { delayBeforeMs: 750, timeoutMs: 12000 },
] as const

export class PayPalApiError extends Error {
  status: number
  payload: PayPalJson | null

  constructor(message: string, status = 500, payload: PayPalJson | null = null) {
    super(message)
    this.name = 'PayPalApiError'
    this.status = status
    this.payload = payload
  }
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function wait(delayMs: number) {
  return delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, delayMs)) : Promise.resolve()
}

function parseJson(raw: string): PayPalJson | null {
  try {
    return raw ? JSON.parse(raw) as PayPalJson : {}
  } catch {
    return null
  }
}

function readPayPalError(payload: PayPalJson | null, fallback: string) {
  const details = Array.isArray(payload?.details) ? payload.details as PayPalJson[] : []
  return text(details[0]?.description) || text(payload?.message) || text(payload?.name) || fallback
}

export function isTransientPayPalError(error: unknown) {
  if (error instanceof PayPalApiError) return error.status === 408 || error.status === 429 || error.status >= 500
  if (error instanceof DOMException && error.name === 'AbortError') return true
  return error instanceof TypeError
}

export function getPayPalEnvironment(): PayPalEnvironment {
  const configured = text(Deno.env.get('PAYPAL_ENVIRONMENT')).toLowerCase() || 'sandbox'
  if (configured !== 'sandbox' && configured !== 'production') {
    throw new Error('PAYPAL_ENVIRONMENT must be sandbox or production.')
  }
  return configured
}

export function getPayPalConfiguration() {
  const clientId = text(Deno.env.get('PAYPAL_CLIENT_ID'))
  const clientSecret = text(Deno.env.get('PAYPAL_CLIENT_SECRET'))
  if (!clientId || !clientSecret) throw new Error('PayPal API credentials are not configured.')
  const environment = getPayPalEnvironment()
  return { clientId, clientSecret, environment, baseUrl: PAYPAL_BASE_URLS[environment] }
}

export function getPayPalReturnUrl(orderCode: string, cancelled = false) {
  const supabaseUrl = text(Deno.env.get('SUPABASE_URL')).replace(/\/+$/, '')
  if (!supabaseUrl) throw new Error('Supabase URL is not configured.')
  const url = new URL(`${supabaseUrl}/functions/v1/paypal-payment-return`)
  url.searchParams.set('order_code', orderCode)
  if (cancelled) url.searchParams.set('cancelled', '1')
  return url.toString()
}

export function requirePayPalApprovalUrl(value: unknown) {
  const url = new URL(text(value))
  const hostname = url.hostname.toLowerCase()
  if (url.protocol !== 'https:' || (hostname !== 'paypal.com' && !hostname.endsWith('.paypal.com'))) {
    throw new Error('PayPal returned an invalid approval URL.')
  }
  return url.toString()
}

export function getPayPalLink(payload: PayPalJson, relation: string) {
  const links = Array.isArray(payload.links) ? payload.links as PayPalJson[] : []
  const match = links.find((link) => text(link.rel).toLowerCase() === relation.toLowerCase())
  return match ? text(match.href) : ''
}

export function getPayPalCapture(payload: PayPalJson) {
  const purchaseUnits = Array.isArray(payload.purchase_units) ? payload.purchase_units as PayPalJson[] : []
  for (const purchaseUnit of purchaseUnits) {
    const payments = purchaseUnit.payments && typeof purchaseUnit.payments === 'object'
      ? purchaseUnit.payments as PayPalJson
      : {}
    const captures = Array.isArray(payments.captures) ? payments.captures as PayPalJson[] : []
    if (captures[0]) return captures[0]
  }
  return null
}

async function getAccessToken() {
  const { clientId, clientSecret, baseUrl } = getPayPalConfiguration()
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en_AU',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const raw = await response.text()
  const payload = parseJson(raw)
  const token = text(payload?.access_token)
  if (!response.ok || !token) {
    throw new PayPalApiError(readPayPalError(payload, 'PayPal authentication failed.'), response.status, payload)
  }
  return token
}

export async function paypalRequest<T extends PayPalJson>(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: PayPalJson
    idempotencyKey?: string
  } = {},
): Promise<T> {
  const { baseUrl } = getPayPalConfiguration()
  const method = options.method ?? 'GET'
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  let lastError: unknown = null

  for (let attempt = 0; attempt < PAYPAL_RETRY_SCHEDULE.length; attempt += 1) {
    const schedule = PAYPAL_RETRY_SCHEDULE[attempt]
    await wait(schedule.delayBeforeMs)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), schedule.timeoutMs)
    try {
      const accessToken = await getAccessToken()
      const response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'return=representation',
          ...(options.idempotencyKey ? { 'PayPal-Request-Id': options.idempotencyKey } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      })
      const raw = await response.text()
      const payload = parseJson(raw)
      if (response.ok) return (payload ?? {}) as T
      throw new PayPalApiError(
        readPayPalError(payload, `PayPal request failed with status ${response.status}.`),
        response.status,
        payload,
      )
    } catch (error) {
      lastError = error
      if (!isTransientPayPalError(error) || attempt === PAYPAL_RETRY_SCHEDULE.length - 1) throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('PayPal request failed.')
}

export async function verifyPayPalWebhook(req: Request, event: PayPalJson) {
  const webhookId = text(Deno.env.get('PAYPAL_WEBHOOK_ID'))
  if (!webhookId) throw new Error('PAYPAL_WEBHOOK_ID is not configured.')
  const requiredHeaders = {
    transmission_id: text(req.headers.get('paypal-transmission-id')),
    transmission_time: text(req.headers.get('paypal-transmission-time')),
    cert_url: text(req.headers.get('paypal-cert-url')),
    auth_algo: text(req.headers.get('paypal-auth-algo')),
    transmission_sig: text(req.headers.get('paypal-transmission-sig')),
  }
  if (Object.values(requiredHeaders).some((value) => !value)) return false
  const result = await paypalRequest<PayPalJson>('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: { ...requiredHeaders, webhook_id: webhookId, webhook_event: event },
  })
  return text(result.verification_status).toUpperCase() === 'SUCCESS'
}
