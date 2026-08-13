export const AUSTRALIA_POST_TRACKING_BASE_URL = 'https://auspost.com.au/mypost/track/details/'

export function normalizeAustraliaPostTrackingNumber(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
}

export function isValidAustraliaPostTrackingNumber(value: unknown) {
  const trackingNumber = normalizeAustraliaPostTrackingNumber(value)
  return /^[A-Z0-9]{8,40}$/.test(trackingNumber)
}

export function buildAustraliaPostTrackingUrl(value: unknown) {
  const trackingNumber = normalizeAustraliaPostTrackingNumber(value)
  if (!isValidAustraliaPostTrackingNumber(trackingNumber)) return ''
  return `${AUSTRALIA_POST_TRACKING_BASE_URL}${encodeURIComponent(trackingNumber)}`
}

export function isAustraliaPostTrackingUrl(value: unknown) {
  const candidate = String(value ?? '').trim()
  if (!candidate) return false
  try {
    const url = new URL(candidate)
    return url.protocol === 'https:'
      && url.hostname === 'auspost.com.au'
      && url.pathname.startsWith('/mypost/track/details/')
  } catch {
    return false
  }
}
