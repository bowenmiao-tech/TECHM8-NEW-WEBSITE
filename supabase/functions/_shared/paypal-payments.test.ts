import {
  PayPalApiError,
  getPayPalCapture,
  getPayPalLink,
  isTransientPayPalError,
  requirePayPalApprovalUrl,
} from './paypal-payments.ts'

Deno.test('accepts only HTTPS PayPal approval URLs', () => {
  const live = requirePayPalApprovalUrl('https://www.paypal.com/checkoutnow?token=ORDER-1')
  const sandbox = requirePayPalApprovalUrl('https://www.sandbox.paypal.com/checkoutnow?token=ORDER-2')
  if (!live.includes('ORDER-1') || !sandbox.includes('ORDER-2')) {
    throw new Error('Expected PayPal approval URLs were not accepted.')
  }
  for (const url of [
    'http://www.paypal.com/checkoutnow?token=ORDER-3',
    'https://paypal.com.example.test/checkoutnow?token=ORDER-4',
  ]) {
    let rejected = false
    try {
      requirePayPalApprovalUrl(url)
    } catch {
      rejected = true
    }
    if (!rejected) throw new Error(`Unsafe approval URL was accepted: ${url}`)
  }
})

Deno.test('extracts payer action and completed capture data', () => {
  const payload = {
    links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1' }],
    purchase_units: [{
      payments: {
        captures: [{ id: 'CAPTURE-1', status: 'COMPLETED', amount: { value: '19.95', currency_code: 'AUD' } }],
      },
    }],
  }
  if (!getPayPalLink(payload, 'payer-action').includes('ORDER-1')) {
    throw new Error('PayPal payer action link was not found.')
  }
  if (getPayPalCapture(payload)?.id !== 'CAPTURE-1') {
    throw new Error('PayPal capture was not found.')
  }
})

Deno.test('retries only transient PayPal responses and transport failures', () => {
  if (!isTransientPayPalError(new PayPalApiError('rate limited', 429))) throw new Error('429 must retry.')
  if (!isTransientPayPalError(new PayPalApiError('server error', 503))) throw new Error('5xx must retry.')
  if (!isTransientPayPalError(new TypeError('network failed'))) throw new Error('network failures must retry.')
  if (isTransientPayPalError(new PayPalApiError('invalid request', 422))) throw new Error('4xx must not retry.')
})
