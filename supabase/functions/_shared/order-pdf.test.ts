import { PDFDocument } from 'npm:pdf-lib@1.17.1'
import {
  generateOrderPdf,
  ORDER_PDF_BRAND_NAME,
  type BusinessProfile,
  type OrderBundle,
  type OrderDocumentType,
} from './order-pdf.ts'

Deno.test('uses the requested invoice brand name', () => {
  if (ORDER_PDF_BRAND_NAME !== 'OZ TECH M8') {
    throw new Error(`Unexpected PDF brand name: ${ORDER_PDF_BRAND_NAME}`)
  }
})

const business: BusinessProfile = {
  legalName: 'YQM PTY LTD',
  tradingName: 'TECHM8',
  abn: '12 345 678 901',
  gstRegistered: true,
  centralEmail: 'techm8contact@gmail.com',
}

const bundle: OrderBundle = {
  order: {
    id: 10226,
    order_code: 'TM8-20260713-TEST01',
    customer_name: 'Test Customer',
    phone: '+61 400 000 000',
    email: 'customer@example.com',
    fulfillment_method: 'shipping',
    payment_method_code: 'zip',
    payment_method_label: 'Zip Pay',
    payment_status: 'paid',
    zip_receipt_number: 'ZIP-RECEIPT-12345',
    status: 'confirmed',
    subtotal_amount: 99,
    discount_amount: 0,
    payment_fee_amount: 1.98,
    shipping_fee_amount: 12,
    total_amount: 112.98,
    amount_paid: 112.98,
    amount_refunded: 0,
    gst_amount: 10.27,
    created_at: '2026-07-13T03:00:00.000Z',
    paid_at: '2026-07-13T03:01:00.000Z',
    recipient_name: 'Test Customer',
    shipping_phone: '+61 400 000 000',
    shipping_email: 'customer@example.com',
    address_line_1: '1 Queen Street',
    suburb: 'Brisbane City',
    state: 'QLD',
    postcode: '4000',
    country_code: 'AU',
  },
  items: [{
    sku: 'TEST-SKU',
    product_name: 'TECHM8 Test Product',
    quantity: 2,
    unit_price: 49.5,
    line_total: 99,
  }],
  store: null,
  issuer: {
    slug: 'park-ridge',
    name: 'TECHM8 Park Ridge',
    email: 'parkridge@example.com',
    phone: '07 0000 0000',
    address_line_1: 'Shop 11, 3732 Mount Lindesay Highway',
    suburb: 'Park Ridge',
    state: 'QLD',
    postcode: '4125',
    country_code: 'AU',
  },
}

for (const type of [
  'order_confirmation',
  'invoice',
  'credit_note',
  'packing_slip',
  'shipping_label',
  'pickup_label',
] as OrderDocumentType[]) {
  Deno.test(`generates a valid ${type} PDF`, async () => {
    const bytes = await generateOrderPdf(
      bundle,
      type,
      `TM8-${type.toUpperCase()}-000001`,
      business,
      type === 'credit_note'
        ? { id: 1, amount: 20, reason: 'Customer return', processed_at: '2026-07-13T04:00:00.000Z' }
        : null,
    )
    if (new TextDecoder().decode(bytes.slice(0, 4)) !== '%PDF') {
      throw new Error(`${type} did not produce a PDF file`)
    }
    const document = await PDFDocument.load(bytes)
    if (document.getPageCount() < 1) throw new Error(`${type} has no pages`)
    const { width, height } = document.getPage(0).getSize()
    const isLabel = type === 'shipping_label' || type === 'pickup_label'
    if (isLabel && (Math.abs(width - 288) > 0.1 || Math.abs(height - 432) > 0.1)) {
      throw new Error(`${type} is not A6 label size`)
    }
    if (!isLabel && (Math.abs(width - 595.28) > 0.1 || Math.abs(height - 841.89) > 0.1)) {
      throw new Error(`${type} is not A4 size`)
    }
  })
}

Deno.test('keeps large invoices across multiple pages', async () => {
  const largeBundle: OrderBundle = {
    ...bundle,
    items: Array.from({ length: 30 }, (_, index) => ({
      sku: `SKU-${String(index + 1).padStart(2, '0')}`,
      product_name: `Invoice line item ${index + 1} with a descriptive product name`,
      quantity: 1,
      unit_price: 10,
      line_total: 10,
    })),
    order: {
      ...bundle.order,
      subtotal_amount: 300,
      total_amount: 300,
      amount_paid: 300,
      gst_amount: 27.27,
    },
  }
  const bytes = await generateOrderPdf(largeBundle, 'invoice', 'TM8-INV-2026-999999', business)
  const document = await PDFDocument.load(bytes)
  if (document.getPageCount() < 2) throw new Error('Large invoice content was not paginated')
})
