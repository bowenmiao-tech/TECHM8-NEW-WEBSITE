import {
  ZIP_API_VERSION,
  ZIP_RETRY_SCHEDULE,
  ZipApiError,
  isTransientZipError,
} from './zip-payments.ts'

Deno.test('uses the certified Zip API version header', () => {
  if (ZIP_API_VERSION !== '2021-08-25') {
    throw new Error(`Unexpected Zip-Version: ${ZIP_API_VERSION}`)
  }
})

Deno.test('uses the documented four-attempt 60 second retry window', () => {
  const totalTimeout = ZIP_RETRY_SCHEDULE.reduce((sum, attempt) => sum + attempt.timeoutMs, 0)
  const totalDelay = ZIP_RETRY_SCHEDULE.reduce((sum, attempt) => sum + attempt.delayBeforeMs, 0)
  if (ZIP_RETRY_SCHEDULE.length !== 4 || totalTimeout !== 40000 || totalDelay !== 20000) {
    throw new Error('Zip retry schedule must use four attempts across a 60 second window.')
  }
})

Deno.test('only retries transient Zip responses and transport failures', () => {
  if (!isTransientZipError(new ZipApiError('rate limited', 429))) throw new Error('429 must retry.')
  if (!isTransientZipError(new ZipApiError('server error', 503))) throw new Error('5xx must retry.')
  if (!isTransientZipError(new TypeError('network failed'))) throw new Error('network failures must retry.')
  if (isTransientZipError(new ZipApiError('invalid request', 422))) throw new Error('4xx must not retry.')
})
