export type ZipEnvironment = 'sandbox' | 'production'
export type ZipJson = Record<string, unknown>

const ZIP_API_VERSION = '2021-08-25'
const ZIP_BASE_URLS: Record<ZipEnvironment, string> = {
  sandbox: 'https://sand.merchant-api.com/merchant',
  production: 'https://merchant-api.com/merchant',
}

export class ZipApiError extends Error {
  status: number
  payload: ZipJson | null

  constructor(message: string, status = 500, payload: ZipJson | null = null) {
    super(message)
    this.name = 'ZipApiError'
    this.status = status
    this.payload = payload
  }
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function readZipError(payload: ZipJson | null, fallback: string) {
  const nestedError = payload?.error as ZipJson | string | undefined
  const errors = Array.isArray(payload?.errors) ? payload.errors as ZipJson[] : []
  return (
    text(payload?.message) ||
    (typeof nestedError === 'string' ? text(nestedError) : text(nestedError?.message)) ||
    text(errors[0]?.message) ||
    fallback
  )
}

export function getZipEnvironment(): ZipEnvironment {
  const configured = text(Deno.env.get('ZIP_ENVIRONMENT')).toLowerCase() || 'sandbox'
  if (configured !== 'sandbox' && configured !== 'production') {
    throw new Error('ZIP_ENVIRONMENT must be sandbox or production.')
  }
  return configured
}

export function getZipConfiguration() {
  const apiKey = text(Deno.env.get('ZIP_API_KEY'))
  if (!apiKey) throw new Error('Zip API key is not configured.')
  const environment = getZipEnvironment()
  return {
    apiKey,
    environment,
    baseUrl: ZIP_BASE_URLS[environment],
  }
}

export function getZipReturnUrl(orderCode: string) {
  const supabaseUrl = text(Deno.env.get('SUPABASE_URL')).replace(/\/+$/, '')
  if (!supabaseUrl) throw new Error('Supabase URL is not configured.')
  const url = new URL(`${supabaseUrl}/functions/v1/zip-payment-return`)
  url.searchParams.set('order_code', orderCode)
  return url.toString()
}

export function requireZipCheckoutUri(value: unknown) {
  const url = new URL(text(value))
  if (url.protocol !== 'https:') throw new Error('Zip returned an invalid checkout URL.')
  return url.toString()
}

export async function zipRequest<T extends ZipJson>(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: ZipJson
    idempotencyKey?: string
  } = {},
): Promise<T> {
  const { apiKey, baseUrl } = getZipConfiguration()
  const method = options.method ?? 'GET'
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  let lastError: unknown = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Zip-Version': ZIP_API_VERSION,
          ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      })
      const raw = await response.text()
      let payload: ZipJson | null = null
      try {
        payload = raw ? JSON.parse(raw) as ZipJson : {}
      } catch {
        payload = null
      }

      if (response.ok) return (payload ?? {}) as T
      const error = new ZipApiError(
        readZipError(payload, `Zip request failed with status ${response.status}.`),
        response.status,
        payload,
      )
      if ((response.status < 500 && response.status !== 429) || attempt === 1) throw error
      lastError = error
    } catch (error) {
      lastError = error
      if (error instanceof ZipApiError || attempt === 1) throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Zip request failed.')
}
