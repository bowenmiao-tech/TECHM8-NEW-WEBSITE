import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
} from 'npm:pdf-lib@1.17.1'

export type JsonRecord = Record<string, unknown>

export type OrderLineItem = {
  sku?: string | null
  product_name?: string | null
  quantity?: number | string | null
  unit_price?: number | string | null
  line_total?: number | string | null
}

export type StoreSnapshot = {
  slug?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  suburb?: string | null
  state?: string | null
  postcode?: string | null
  country_code?: string | null
}

export type OrderBundle = {
  order: JsonRecord & {
    id: number
    order_code: string
    customer_name?: string | null
    phone?: string | null
    email?: string | null
    fulfillment_method?: string | null
    payment_method_label?: string | null
    payment_status?: string | null
    status?: string | null
    subtotal_amount?: number | string | null
    discount_amount?: number | string | null
    payment_fee_amount?: number | string | null
    shipping_fee_amount?: number | string | null
    total_amount?: number | string | null
    amount_paid?: number | string | null
    amount_refunded?: number | string | null
    gst_amount?: number | string | null
    created_at?: string | null
    paid_at?: string | null
    issuer_snapshot?: StoreSnapshot | null
    fulfillment_snapshot?: JsonRecord | null
    billing_snapshot?: JsonRecord | null
    recipient_name?: string | null
    company_name?: string | null
    shipping_phone?: string | null
    shipping_email?: string | null
    address_line_1?: string | null
    address_line_2?: string | null
    suburb?: string | null
    state?: string | null
    postcode?: string | null
    country_code?: string | null
    shipping_service_name?: string | null
    tracking_number?: string | null
  }
  items: OrderLineItem[]
  store: StoreSnapshot | null
  issuer: StoreSnapshot | null
}

export type BusinessProfile = {
  legalName: string
  tradingName: string
  abn: string
  gstRegistered: boolean
  centralEmail: string
}

export type OrderDocumentType =
  | 'order_confirmation'
  | 'invoice'
  | 'credit_note'
  | 'packing_slip'
  | 'shipping_label'
  | 'pickup_label'

export type RefundDocumentData = {
  id?: number | string | null
  amount?: number | string | null
  reason?: string | null
  processed_at?: string | null
}

const A4: [number, number] = [595.28, 841.89]
const A6_LABEL: [number, number] = [288, 432]
const INK = rgb(0.04, 0.16, 0.19)
const MUTED = rgb(0.32, 0.43, 0.46)
const TEAL = rgb(0, 0.67, 0.62)
const PALE = rgb(0.92, 0.98, 0.97)
const LINE = rgb(0.80, 0.88, 0.87)

function numeric(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value: unknown) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(numeric(value))
}

function dateText(value: unknown) {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function statusText(value: unknown) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase()) || '-'
}

export function safePdfText(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
}

function addressLines(value: JsonRecord | StoreSnapshot | null | undefined) {
  if (!value) return []
  const record = value as JsonRecord
  const locality = [record.suburb, record.state, record.postcode]
    .map((part) => safePdfText(part).trim())
    .filter(Boolean)
    .join(' ')
  return [
    record.name ?? record.recipient_name,
    record.company_name,
    record.address_line_1,
    record.address_line_2,
    locality,
    record.country_code === 'AU' || !record.country_code ? 'Australia' : record.country_code,
  ]
    .map((line) => safePdfText(line).trim())
    .filter(Boolean)
}

function splitText(font: PDFFont, text: string, fontSize: number, maxWidth: number) {
  const words = safePdfText(text).split(/\s+/).filter(Boolean)
  if (!words.length) return ['']
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth || !current) {
      current = candidate
      continue
    }
    lines.push(current)
    current = word
  }
  if (current) lines.push(current)
  return lines
}

function drawWrapped(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: { size?: number; color?: ReturnType<typeof rgb>; lineHeight?: number } = {},
) {
  const size = options.size ?? 10
  const lineHeight = options.lineHeight ?? size * 1.35
  const lines = splitText(font, text, size, maxWidth)
  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size,
      font,
      color: options.color ?? INK,
    })
  })
  return y - lines.length * lineHeight
}

function drawAddress(
  page: PDFPage,
  font: PDFFont,
  lines: string[],
  x: number,
  y: number,
  width: number,
) {
  let nextY = y
  lines.forEach((line) => {
    nextY = drawWrapped(page, font, line, x, nextY, width, { size: 9.5, lineHeight: 13 })
  })
  return nextY
}

function drawSectionLabel(page: PDFPage, font: PDFFont, label: string, x: number, y: number) {
  page.drawText(safePdfText(label).toUpperCase(), {
    x,
    y,
    size: 8,
    font,
    color: MUTED,
  })
}

function documentTitle(type: OrderDocumentType, business: BusinessProfile) {
  if (type === 'order_confirmation') return 'Order Confirmation'
  if (type === 'credit_note') return 'Credit Note'
  if (type === 'packing_slip') return 'Packing Slip'
  if (type === 'shipping_label') return 'Shipping Address Label'
  if (type === 'pickup_label') return 'Pickup Label'
  return business.gstRegistered && business.abn ? 'Tax Invoice' : 'Invoice'
}

function buildCustomerAddress(
  bundle: OrderBundle,
  type: Exclude<OrderDocumentType, 'shipping_label' | 'pickup_label'>,
) {
  const order = bundle.order
  if (type !== 'packing_slip' && order.billing_snapshot && Object.keys(order.billing_snapshot).length) {
    return addressLines(order.billing_snapshot)
  }
  if (order.fulfillment_method === 'shipping') {
    const snapshot = order.fulfillment_snapshot && Object.keys(order.fulfillment_snapshot).length
      ? order.fulfillment_snapshot
      : {
          recipient_name: order.recipient_name || order.customer_name,
          company_name: order.company_name,
          address_line_1: order.address_line_1,
          address_line_2: order.address_line_2,
          suburb: order.suburb,
          state: order.state,
          postcode: order.postcode,
          country_code: order.country_code || 'AU',
        }
    return addressLines(snapshot)
  }
  return [
    safePdfText(order.customer_name || 'Customer'),
    safePdfText(order.email || ''),
    safePdfText(order.phone || ''),
  ].filter(Boolean)
}

async function generateA4Document(
  bundle: OrderBundle,
  type: Exclude<OrderDocumentType, 'shipping_label' | 'pickup_label'>,
  number: string,
  business: BusinessProfile,
  refund?: RefundDocumentData | null,
) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`${documentTitle(type, business)} ${number}`)
  pdf.setAuthor(business.legalName)
  pdf.setCreator('TECHM8 Order Operations')
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let page = pdf.addPage(A4)
  const { width, height } = page.getSize()
  const margin = 42
  const contentWidth = width - margin * 2
  const title = documentTitle(type, business)

  page.drawRectangle({ x: 0, y: height - 112, width, height: 112, color: INK })
  page.drawText('TECHM8', { x: margin, y: height - 55, size: 27, font: bold, color: rgb(1, 1, 1) })
  page.drawText(safePdfText(business.legalName), { x: margin, y: height - 77, size: 9, font: regular, color: rgb(0.78, 0.94, 0.92) })
  const titleWidth = bold.widthOfTextAtSize(title.toUpperCase(), 18)
  page.drawText(title.toUpperCase(), {
    x: width - margin - titleWidth,
    y: height - 58,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  })
  const numberWidth = regular.widthOfTextAtSize(number, 10)
  page.drawText(number, {
    x: width - margin - numberWidth,
    y: height - 80,
    size: 10,
    font: regular,
    color: rgb(0.78, 0.94, 0.92),
  })

  let y = height - 146
  const leftWidth = contentWidth * 0.48
  const rightX = margin + contentWidth * 0.54
  const rightWidth = contentWidth * 0.46

  drawSectionLabel(page, bold, 'Supplier', margin, y)
  drawSectionLabel(page, bold, type === 'packing_slip' ? 'Ship / collect for' : 'Bill to', rightX, y)
  y -= 17
  let leftY = y
  leftY = drawWrapped(page, bold, `${business.legalName} trading as ${business.tradingName}`, margin, leftY, leftWidth, { size: 10.5 })
  if (business.abn) {
    leftY = drawWrapped(page, regular, `ABN ${business.abn}`, margin, leftY - 1, leftWidth, { size: 9.5 })
  }
  leftY = drawAddress(page, regular, addressLines(bundle.issuer), margin, leftY - 1, leftWidth)
  if (bundle.issuer?.phone) leftY = drawWrapped(page, regular, String(bundle.issuer.phone), margin, leftY, leftWidth, { size: 9.5 })
  if (business.centralEmail) leftY = drawWrapped(page, regular, business.centralEmail, margin, leftY, leftWidth, { size: 9.5 })

  let rightY = y
  rightY = drawAddress(page, regular, buildCustomerAddress(bundle, type), rightX, rightY, rightWidth)
  if (bundle.order.fulfillment_method === 'pickup') {
    rightY = drawWrapped(page, bold, 'Click & Collect', rightX, rightY - 2, rightWidth, { size: 9.5, color: TEAL })
  }

  y = Math.min(leftY, rightY) - 18
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: LINE })
  y -= 28

  const meta = [
    ['Order reference', bundle.order.order_code],
    ['Issue date', dateText(type === 'credit_note' ? refund?.processed_at : new Date().toISOString())],
    ['Order date', dateText(bundle.order.created_at)],
    ['Payment method', bundle.order.payment_method_label || '-'],
    ['Payment status', statusText(bundle.order.payment_status)],
    ['Fulfilment', bundle.order.fulfillment_method === 'shipping' ? 'Shipping' : 'Store pickup'],
  ]
  const metaColumnWidth = contentWidth / 3
  meta.forEach(([label, value], index) => {
    const column = index % 3
    const row = Math.floor(index / 3)
    const x = margin + column * metaColumnWidth
    const itemY = y - row * 42
    drawSectionLabel(page, bold, label, x, itemY)
    drawWrapped(page, regular, safePdfText(value), x, itemY - 15, metaColumnWidth - 12, { size: 9.5 })
  })
  y -= 96

  const drawContinuationHeader = (target: PDFPage, section: string) => {
    target.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: INK })
    target.drawText('TECHM8', { x: margin, y: height - 39, size: 22, font: bold, color: rgb(1, 1, 1) })
    const continuationTitle = `${title} - ${section}`
    const continuationWidth = bold.widthOfTextAtSize(continuationTitle, 12)
    target.drawText(continuationTitle, {
      x: width - margin - continuationWidth,
      y: height - 37,
      size: 12,
      font: bold,
      color: rgb(1, 1, 1),
    })
    target.drawText(safePdfText(bundle.order.order_code), {
      x: margin,
      y: height - 57,
      size: 8.5,
      font: regular,
      color: rgb(0.78, 0.94, 0.92),
    })
    return height - 98
  }

  const drawItemsHeader = (target: PDFPage, headerY: number) => {
    target.drawRectangle({ x: margin, y: headerY - 5, width: contentWidth, height: 25, color: PALE })
    target.drawText('DESCRIPTION', { x: margin + 8, y: headerY + 4, size: 8, font: bold, color: MUTED })
    target.drawText('QTY', { x: width - margin - 174, y: headerY + 4, size: 8, font: bold, color: MUTED })
    target.drawText('UNIT PRICE', { x: width - margin - 126, y: headerY + 4, size: 8, font: bold, color: MUTED })
    target.drawText('AMOUNT', { x: width - margin - 55, y: headerY + 4, size: 8, font: bold, color: MUTED })
  }

  drawItemsHeader(page, y)
  y -= 25

  const itemNameWidth = contentWidth - 190
  for (const item of bundle.items) {
    const name = safePdfText(item.product_name || 'Item')
    const sku = safePdfText(item.sku || '')
    const lines = splitText(regular, name, 9.5, itemNameWidth)
    const rowHeight = Math.max(34, lines.length * 12 + (sku ? 12 : 0) + 8)
    if (y - rowHeight < 90) {
      page = pdf.addPage(A4)
      y = drawContinuationHeader(page, 'Items continued')
      drawItemsHeader(page, y)
      y -= 25
    }
    lines.forEach((line, index) => {
      page.drawText(line, { x: margin + 8, y: y - 12 - index * 12, size: 9.5, font: regular, color: INK })
    })
    if (sku) {
      page.drawText(`SKU: ${sku}`, { x: margin + 8, y: y - 12 - lines.length * 12, size: 7.8, font: regular, color: MUTED })
    }
    page.drawText(String(Math.max(0, numeric(item.quantity))), { x: width - margin - 171, y: y - 12, size: 9.5, font: regular, color: INK })
    page.drawText(money(item.unit_price), { x: width - margin - 126, y: y - 12, size: 9.5, font: regular, color: INK })
    const lineAmount = money(item.line_total)
    page.drawText(lineAmount, {
      x: width - margin - regular.widthOfTextAtSize(lineAmount, 9.5),
      y: y - 12,
      size: 9.5,
      font: regular,
      color: INK,
    })
    page.drawLine({ start: { x: margin, y: y - rowHeight }, end: { x: width - margin, y: y - rowHeight }, thickness: 0.6, color: LINE })
    y -= rowHeight
  }

  if (type === 'credit_note' && refund) {
    const amount = numeric(refund.amount)
    page.drawText('Refund adjustment', { x: margin + 8, y: y - 15, size: 9.5, font: regular, color: INK })
    const amountText = `-${money(amount)}`
    page.drawText(amountText, {
      x: width - margin - regular.widthOfTextAtSize(amountText, 9.5),
      y: y - 15,
      size: 9.5,
      font: regular,
      color: INK,
    })
    y -= 38
  }

  y -= 15
  const totalsX = width - margin - 220
  const totalsValueX = width - margin
  const totals: Array<[string, unknown]> = type === 'credit_note' && refund
    ? [
        ['Refund amount', numeric(refund.amount)],
        ['Amount refunded to date', bundle.order.amount_refunded],
      ]
    : [
        ['Subtotal', bundle.order.subtotal_amount],
        ...(numeric(bundle.order.discount_amount) ? [['Discount', -numeric(bundle.order.discount_amount)] as [string, unknown]] : []),
        ...(numeric(bundle.order.shipping_fee_amount) ? [['Shipping', bundle.order.shipping_fee_amount] as [string, unknown]] : []),
        ...(numeric(bundle.order.payment_fee_amount) ? [['Payment processing fee', bundle.order.payment_fee_amount] as [string, unknown]] : []),
        ...(business.gstRegistered ? [['GST included', bundle.order.gst_amount] as [string, unknown]] : []),
        ['Total', bundle.order.total_amount],
        ['Amount paid', bundle.order.amount_paid],
        ...(numeric(bundle.order.amount_refunded) ? [['Amount refunded', bundle.order.amount_refunded] as [string, unknown]] : []),
      ]
  const footerY = 45
  if (y - totals.length * 20 < footerY + 35) {
    page = pdf.addPage(A4)
    y = drawContinuationHeader(page, 'Order totals')
  }
  totals.forEach(([label, value], index) => {
    const rowY = y - index * 20
    const isStrong = label === 'Total' || label === 'Refund amount'
    const font = isStrong ? bold : regular
    const valueText = money(value)
    page.drawText(String(label), { x: totalsX, y: rowY, size: isStrong ? 10 : 9, font, color: isStrong ? INK : MUTED })
    page.drawText(valueText, {
      x: totalsValueX - font.widthOfTextAtSize(valueText, isStrong ? 10 : 9),
      y: rowY,
      size: isStrong ? 10 : 9,
      font,
      color: INK,
    })
  })

  page.drawLine({ start: { x: margin, y: footerY + 24 }, end: { x: width - margin, y: footerY + 24 }, thickness: 0.8, color: LINE })
  const footer = type === 'order_confirmation'
    ? bundle.order.payment_method_code === 'pay_in_store'
      ? 'Payment is due at the selected TECHM8 store when the order is collected.'
      : bundle.order.payment_status === 'paid'
        ? 'Payment has been received. Your paid invoice is issued separately.'
        : 'Payment confirmation and a paid invoice will be issued after payment completes.'
    : type === 'packing_slip'
      ? 'Internal fulfilment document. Prices are shown on the customer invoice.'
      : type === 'credit_note'
        ? `This credit note adjusts invoice ${safePdfText(bundle.order.invoice_number || bundle.order.order_code)}.`
        : 'Thank you for shopping with TECHM8.'
  drawWrapped(page, regular, footer, margin, footerY + 6, contentWidth, { size: 8.5, color: MUTED })

  const pages = pdf.getPages()
  pages.forEach((documentPage, index) => {
    const pageNumber = `Page ${index + 1} of ${pages.length}`
    documentPage.drawText(pageNumber, {
      x: width - margin - regular.widthOfTextAtSize(pageNumber, 7.5),
      y: 22,
      size: 7.5,
      font: regular,
      color: MUTED,
    })
  })

  return new Uint8Array(await pdf.save())
}

async function generateLabel(
  bundle: OrderBundle,
  type: 'shipping_label' | 'pickup_label',
  number: string,
  business: BusinessProfile,
) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`${documentTitle(type, business)} ${bundle.order.order_code}`)
  pdf.setAuthor(business.legalName)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage(A6_LABEL)
  const { width, height } = page.getSize()
  const margin = 18

  page.drawRectangle({ x: 0, y: height - 68, width, height: 68, color: INK })
  page.drawText('TECHM8', { x: margin, y: height - 38, size: 23, font: bold, color: rgb(1, 1, 1) })
  page.drawText(type === 'shipping_label' ? 'SHIPPING ADDRESS LABEL' : 'CLICK & COLLECT LABEL', {
    x: margin,
    y: height - 56,
    size: 8,
    font: bold,
    color: rgb(0.75, 0.94, 0.91),
  })

  let y = height - 94
  if (type === 'shipping_label') {
    drawSectionLabel(page, bold, 'Ship to', margin, y)
    y -= 20
    const recipientLines = buildCustomerAddress(bundle, 'packing_slip')
    recipientLines.forEach((line, index) => {
      y = drawWrapped(page, index === 0 ? bold : regular, line, margin, y, width - margin * 2, {
        size: index === 0 ? 15 : 13,
        lineHeight: index === 0 ? 20 : 18,
      })
    })
    if (bundle.order.shipping_phone || bundle.order.phone) {
      y = drawWrapped(page, regular, `Phone: ${bundle.order.shipping_phone || bundle.order.phone}`, margin, y - 4, width - margin * 2, { size: 10 })
    }
    page.drawRectangle({ x: margin, y: 78, width: width - margin * 2, height: 60, borderColor: LINE, borderWidth: 1 })
    drawSectionLabel(page, bold, 'From', margin + 10, 121)
    drawWrapped(page, regular, addressLines(bundle.issuer).join(', '), margin + 10, 104, width - margin * 2 - 20, { size: 8.5, lineHeight: 11 })
    page.drawText('POSTAGE / CARRIER LABEL REQUIRED', { x: margin, y: 55, size: 8, font: bold, color: MUTED })
  } else {
    drawSectionLabel(page, bold, 'Customer', margin, y)
    y -= 22
    y = drawWrapped(page, bold, String(bundle.order.customer_name || 'Customer'), margin, y, width - margin * 2, { size: 18, lineHeight: 23 })
    y = drawWrapped(page, regular, String(bundle.order.phone || ''), margin, y - 2, width - margin * 2, { size: 12 })
    y = drawWrapped(page, regular, String(bundle.order.email || ''), margin, y, width - margin * 2, { size: 10 })
    y -= 20
    drawSectionLabel(page, bold, 'Pickup store', margin, y)
    y -= 19
    addressLines(bundle.store).forEach((line) => {
      y = drawWrapped(page, regular, line, margin, y, width - margin * 2, { size: 11, lineHeight: 15 })
    })
  }

  page.drawRectangle({ x: margin, y: 14, width: width - margin * 2, height: 30, color: PALE })
  page.drawText(safePdfText(bundle.order.order_code), { x: margin + 8, y: 25, size: 14, font: bold, color: INK })
  const numberText = safePdfText(number)
  page.drawText(numberText, {
    x: width - margin - 8 - regular.widthOfTextAtSize(numberText, 7.5),
    y: 26,
    size: 7.5,
    font: regular,
    color: MUTED,
  })

  return new Uint8Array(await pdf.save())
}

export async function generateOrderPdf(
  bundle: OrderBundle,
  type: OrderDocumentType,
  number: string,
  business: BusinessProfile,
  refund?: RefundDocumentData | null,
) {
  if (type === 'shipping_label' || type === 'pickup_label') {
    return generateLabel(bundle, type, number, business)
  }
  return generateA4Document(bundle, type, number, business, refund)
}

export function getDocumentTitle(type: OrderDocumentType, business: BusinessProfile) {
  return documentTitle(type, business)
}

export function getDocumentPrefix(type: OrderDocumentType) {
  switch (type) {
    case 'order_confirmation':
      return 'ORD'
    case 'invoice':
      return 'INV'
    case 'credit_note':
      return 'CN'
    case 'packing_slip':
      return 'PACK'
    case 'shipping_label':
      return 'SHIP'
    case 'pickup_label':
      return 'PICK'
  }
}
