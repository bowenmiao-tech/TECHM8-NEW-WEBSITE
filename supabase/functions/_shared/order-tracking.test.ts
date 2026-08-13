import {
  AUSTRALIA_POST_TRACKING_BASE_URL,
  buildAustraliaPostTrackingUrl,
  isAustraliaPostTrackingUrl,
  isValidAustraliaPostTrackingNumber,
  normalizeAustraliaPostTrackingNumber,
} from './order-tracking.ts'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

Deno.test('Australia Post tracking numbers are normalized before creating the URL', () => {
  const input = ' r41 4043024850996006120907 '
  const normalized = normalizeAustraliaPostTrackingNumber(input)
  const url = buildAustraliaPostTrackingUrl(input)
  assert(normalized === 'R414043024850996006120907', `Unexpected normalized number: ${normalized}`)
  assert(
    url === `${AUSTRALIA_POST_TRACKING_BASE_URL}R414043024850996006120907`,
    `Unexpected tracking URL: ${url}`,
  )
})

Deno.test('invalid tracking input never creates an Australia Post URL', () => {
  assert(!isValidAustraliaPostTrackingNumber('short'), 'Short input should not be accepted')
  assert(buildAustraliaPostTrackingUrl('R41/invalid') === '', 'Unsafe characters should not be accepted')
})

Deno.test('only official Australia Post tracking links are accepted for the email button', () => {
  assert(
    isAustraliaPostTrackingUrl('https://auspost.com.au/mypost/track/details/R414043024850996006120907'),
    'The official tracking link should be accepted',
  )
  assert(!isAustraliaPostTrackingUrl('https://example.com/track/R4140'), 'Other domains must be rejected')
  assert(!isAustraliaPostTrackingUrl('javascript:alert(1)'), 'Unsafe protocols must be rejected')
})
