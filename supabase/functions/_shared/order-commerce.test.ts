import {
  documentsForRecipient,
  internalFulfillmentDocumentTypes,
} from './order-commerce.ts'

Deno.test('pickup submission automatically prepares packing slip and pickup docket', () => {
  const types = internalFulfillmentDocumentTypes('order_submitted', {
    fulfillment_method: 'pickup',
  })
  if (types.join(',') !== 'packing_slip,pickup_label') {
    throw new Error(`Unexpected pickup document plan: ${types.join(',')}`)
  }
})

Deno.test('paid shipping order automatically prepares packing slip and shipping label', () => {
  const types = internalFulfillmentDocumentTypes('payment_confirmed', {
    fulfillment_method: 'shipping',
  })
  if (types.join(',') !== 'packing_slip,shipping_label') {
    throw new Error(`Unexpected shipping document plan: ${types.join(',')}`)
  }
})

Deno.test('internal recipients receive fulfilment documents but customer does not', () => {
  const customerDocuments = [{ fileName: 'confirmation.pdf' }, { fileName: 'invoice.pdf' }] as never[]
  const internalDocuments = [{ fileName: 'packing-slip.pdf' }, { fileName: 'pickup-docket.pdf' }] as never[]
  const customer = documentsForRecipient('customer', customerDocuments, internalDocuments)
  const store = documentsForRecipient('store', customerDocuments, internalDocuments)
  const central = documentsForRecipient('central', customerDocuments, internalDocuments)
  if (customer.length !== 2 || store.length !== 4 || central.length !== 4) {
    throw new Error('Recipient attachment routing is incorrect.')
  }
})
