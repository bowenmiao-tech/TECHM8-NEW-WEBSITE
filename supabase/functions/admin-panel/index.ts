import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const STORE_SORT_ORDER = ['park-ridge', 'fairfield', 'toowong', 'north-lakes', 'brassall', 'warehouse-dispatch']
const PRODUCT_IMAGE_BUCKET = 'product-images'
const SUPER_ADMIN_ROLE = 'super_admin'
const CATALOG_EDIT_ROLES = new Set([SUPER_ADMIN_ROLE])
const ORDER_EDIT_ROLES = new Set([SUPER_ADMIN_ROLE, 'store_manager', 'staff'])
const REPAIR_EDIT_ROLES = new Set([SUPER_ADMIN_ROLE, 'store_manager', 'staff'])
const INVENTORY_EDIT_ROLES = new Set([SUPER_ADMIN_ROLE, 'store_manager'])
const CUSTOMER_EDIT_ROLES = new Set([SUPER_ADMIN_ROLE])

type AdminContext = {
  id: number
  auth_user_id: string | null
  email: string | null
  display_name: string | null
  role: string
  store_slug: string | null
  is_active: boolean
}

type JsonRecord = Record<string, unknown>

function jsonResponse(payload: JsonRecord, status = 200) {
  return Response.json(payload, { status, headers: corsHeaders })
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get('authorization') ?? ''
  if (!authorization.toLowerCase().startsWith('bearer ')) return ''
  return authorization.slice(7).trim()
}

function isSuperAdmin(context: AdminContext) {
  return context.role === SUPER_ADMIN_ROLE
}

function normalizeStoreOrder<T extends { slug?: string | null }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftIndex = STORE_SORT_ORDER.indexOf(String(left.slug ?? '').trim())
    const rightIndex = STORE_SORT_ORDER.indexOf(String(right.slug ?? '').trim())
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex)
    }
    return String(left.slug ?? '').localeCompare(String(right.slug ?? ''))
  })
}

function clampPage(input: unknown, fallback = 1) {
  const value = Number(input)
  if (!Number.isFinite(value) || value < 1) return fallback
  return Math.floor(value)
}

function clampPageSize(input: unknown, fallback = 20, max = 100) {
  const value = Number(input)
  if (!Number.isFinite(value) || value < 1) return fallback
  return Math.min(max, Math.floor(value))
}

function normalizeNullableString(value: unknown) {
  const text = String(value ?? '').trim()
  return text ? text : null
}

function normalizeNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function normalizeEmail(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase()
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text) ? text : null
}

function normalizePhone(value: unknown) {
  let text = String(value ?? '').trim()
  if (!text) return null
  text = text.replace(/[^\d+]/g, '')
  if (text.startsWith('+61')) return `0${text.slice(3)}`
  if (text.startsWith('61') && text.length >= 11) return `0${text.slice(2)}`
  return text || null
}

function getCustomerContactKey(email: string | null, phone: string | null) {
  if (email) return `email:${email}`
  if (phone) return `phone:${phone.replace(/\D/g, '')}`
  return `manual:${crypto.randomUUID()}`
}

function normalizeMarketingStatus(value: unknown) {
  const text = String(value ?? '').trim().toUpperCase()
  if (['SUBSCRIBED', 'UNSUBSCRIBED', 'NOT_SET'].includes(text)) return text
  return 'NOT_SET'
}

function normalizeStorageSegment(value: unknown, fallback = 'product') {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return text || fallback
}

function decodeBase64ToBytes(value: unknown) {
  const base64 = String(value ?? '').replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
  if (!base64) return null
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function getBrisbaneDayBounds() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return {
    start: `${year}-${month}-${day}T00:00:00+10:00`,
    end: `${year}-${month}-${day}T23:59:59.999+10:00`,
  }
}

async function getAdminContext(supabaseAdmin: ReturnType<typeof createClient>, req: Request) {
  const bearerToken = getBearerToken(req)
  if (!bearerToken) {
    return { error: jsonResponse({ ok: false, error: 'Missing authorization token.' }, 401), context: null }
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearerToken)
  if (authError || !authData.user) {
    return { error: jsonResponse({ ok: false, error: 'Admin session is invalid.' }, 401), context: null }
  }

  const authUser = authData.user

  let adminRow: AdminContext | null = null

  const { data: adminById } = await supabaseAdmin
    .from('admin_users')
    .select('id, auth_user_id, email, display_name, role, store_slug, is_active')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  adminRow = adminById as AdminContext | null

  if (!adminRow && authUser.email) {
    const emailValue = authUser.email.toLowerCase()
    const { data: adminByEmail } = await supabaseAdmin
      .from('admin_users')
      .select('id, auth_user_id, email, display_name, role, store_slug, is_active')
      .ilike('email', emailValue)
      .maybeSingle()

    if (adminByEmail) {
      adminRow = adminByEmail as AdminContext
      if (!adminRow.auth_user_id) {
        await supabaseAdmin
          .from('admin_users')
          .update({ auth_user_id: authUser.id })
          .eq('id', adminRow.id)
      }
    }
  }

  if (!adminRow || !adminRow.is_active) {
    return { error: jsonResponse({ ok: false, error: 'You do not have admin access.' }, 403), context: null }
  }

  return {
    error: null,
    context: {
      ...adminRow,
      email: authUser.email?.toLowerCase() ?? adminRow.email ?? null,
      display_name:
        adminRow.display_name ||
        String(authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email || 'TECHM8 Admin'),
    } satisfies AdminContext,
  }
}

async function getSharedLists(supabaseAdmin: ReturnType<typeof createClient>) {
  const [{ data: stores }, { data: categories }] = await Promise.all([
    supabaseAdmin
      .from('stores')
      .select('id, slug, name, is_active, address_line_1, address_line_2, suburb, state, postcode, phone, email, opening_hours')
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('categories')
      .select('id, slug, name')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
  ])

  return {
    stores: normalizeStoreOrder((stores ?? []) as Array<{ id: number; slug: string; name: string; is_active: boolean }>),
    categories: (categories ?? []) as Array<{ id: number; slug: string; name: string }>,
  }
}

async function getDashboardData(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext) {
  const { start, end } = getBrisbaneDayBounds()
  const scopedStoreSlug = isSuperAdmin(context) ? null : context.store_slug

  const countQuery = async (
    table: string,
    column = 'id',
    apply?: (query: any) => any,
  ) => {
    let query = supabaseAdmin.from(table).select(column, { count: 'exact', head: true })
    if (scopedStoreSlug && ['orders', 'repair_bookings'].includes(table)) {
      query = query.eq('store_slug', scopedStoreSlug)
    }
    if (apply) {
      query = apply(query)
    }
    const { count } = await query
    return count ?? 0
  }

  const [todayOrdersCount, pendingOrdersCount, todayRepairCount, openRepairCount, lowStockCount] = await Promise.all([
    countQuery('orders', 'id', (query) => query.gte('created_at', start).lte('created_at', end)),
    countQuery('orders', 'id', (query) => query.in('status', ['submitted', 'confirmed', 'packed'])),
    countQuery('repair_bookings', 'id', (query) => query.gte('created_at', start).lte('created_at', end)),
    countQuery('repair_bookings', 'id', (query) => query.in('status', ['new', 'contacted', 'in_progress'])),
    countQuery('products', 'id', (query) => query.lte('stock_quantity', 5).eq('is_visible', true)),
  ])

  let recentOrdersQuery = supabaseAdmin
    .from('orders')
    .select('id, order_code, customer_name, phone, email, store_slug, fulfillment_method, recipient_name, company_name, shipping_phone, shipping_email, address_line_1, address_line_2, suburb, state, postcode, country_code, payment_method_label, payment_status, status, fulfillment_status, subtotal_amount, payment_fee_amount, shipping_fee_amount, total_amount, notes, tracking_number, tracking_url, created_at')
    .order('created_at', { ascending: false })
    .limit(8)

  let recentRepairsQuery = supabaseAdmin
    .from('repair_bookings')
    .select('id, booking_code, customer_name, phone, email, store_slug, device_model, repair_category, brand, issue_description, preferred_date, preferred_time, status, created_at')
    .order('created_at', { ascending: false })
    .limit(8)

  if (scopedStoreSlug) {
    recentOrdersQuery = recentOrdersQuery.eq('store_slug', scopedStoreSlug)
    recentRepairsQuery = recentRepairsQuery.eq('store_slug', scopedStoreSlug)
  }

  const [{ data: recentOrders }, { data: recentRepairs }, { data: lowStockItems }, { data: salesRows }] = await Promise.all([
    recentOrdersQuery,
    recentRepairsQuery,
    supabaseAdmin
      .from('products')
      .select('id, sku, name, stock_quantity, image_url')
      .lte('stock_quantity', 5)
      .eq('is_visible', true)
      .order('stock_quantity', { ascending: true })
      .limit(8),
    (() => {
      let query = supabaseAdmin
        .from('orders')
        .select('total_amount')
        .gte('created_at', start)
        .lte('created_at', end)
        .neq('status', 'cancelled')
      if (scopedStoreSlug) query = query.eq('store_slug', scopedStoreSlug)
      return query
    })(),
  ])

  const salesToday = Number((salesRows ?? []).reduce((sum, row) => sum + (Number((row as { total_amount?: number }).total_amount) || 0), 0).toFixed(2))
  const recentOrderIds = (recentOrders ?? []).map((row) => (row as { id: number }).id)
  const { data: recentOrderItems } = recentOrderIds.length
    ? await supabaseAdmin
        .from('order_items')
        .select('id, order_id, product_name, quantity, image_url, unit_price, line_total')
        .in('order_id', recentOrderIds)
        .order('id', { ascending: true })
    : { data: [] as unknown[] }

  const itemsByOrderId = new Map<number, unknown[]>()
  ;(recentOrderItems ?? []).forEach((item) => {
    const orderId = (item as { order_id: number }).order_id
    const items = itemsByOrderId.get(orderId) ?? []
    items.push(item)
    itemsByOrderId.set(orderId, items)
  })

  return {
    cards: [
      { key: 'today_orders', label: 'Orders today', value: todayOrdersCount, tone: 'primary' },
      { key: 'pending_orders', label: 'Open orders', value: pendingOrdersCount, tone: 'warning' },
      { key: 'today_repairs', label: 'Repair bookings today', value: todayRepairCount, tone: 'primary' },
      { key: 'open_repairs', label: 'Active repairs', value: openRepairCount, tone: 'warning' },
      { key: 'low_stock', label: 'Low stock products', value: lowStockCount, tone: 'danger' },
      { key: 'sales_today', label: 'Sales today', value: salesToday, tone: 'success', money: true },
    ],
    recent_orders: (recentOrders ?? []).map((row) => ({
      ...row,
      items: itemsByOrderId.get((row as { id: number }).id) ?? [],
    })),
    recent_repairs: recentRepairs ?? [],
    low_stock_items: lowStockItems ?? [],
  }
}

async function listOrders(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, filters: JsonRecord) {
  const page = clampPage(filters.page, 1)
  const pageSize = clampPageSize(filters.page_size, 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const scopedStoreSlug = isSuperAdmin(context) ? normalizeNullableString(filters.store_slug) : context.store_slug
  const search = String(filters.search ?? '').trim()

  let query = supabaseAdmin
    .from('orders')
    .select('id, order_code, customer_name, phone, email, store_slug, fulfillment_method, payment_method_label, payment_status, status, fulfillment_status, subtotal_amount, payment_fee_amount, total_amount, notes, tracking_number, tracking_url, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (scopedStoreSlug) query = query.eq('store_slug', scopedStoreSlug)
  const status = normalizeNullableString(filters.status)
  if (status) query = query.eq('status', status)
  const paymentStatus = normalizeNullableString(filters.payment_status)
  if (paymentStatus) query = query.eq('payment_status', paymentStatus)
  const fulfillmentStatus = normalizeNullableString(filters.fulfillment_status)
  if (fulfillmentStatus) query = query.eq('fulfillment_status', fulfillmentStatus)
  if (search) {
    const safe = search.replace(/[%*,]/g, ' ').trim()
    query = query.or(`order_code.ilike.%${safe}%,customer_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`)
  }

  const { data: orders, error, count } = await query
  if (error) throw error

  const orderIds = (orders ?? []).map((order) => (order as { id: number }).id)
  const { data: orderItems } = orderIds.length
    ? await supabaseAdmin
        .from('order_items')
        .select('id, order_id, product_name, quantity, image_url, unit_price, line_total')
        .in('order_id', orderIds)
        .order('id', { ascending: true })
    : { data: [] }

  const itemsByOrderId = new Map<number, unknown[]>()
  ;(orderItems ?? []).forEach((item) => {
    const orderId = (item as { order_id: number }).order_id
    const items = itemsByOrderId.get(orderId) ?? []
    items.push(item)
    itemsByOrderId.set(orderId, items)
  })

  return {
    rows: (orders ?? []).map((order) => ({
      ...order,
      items: itemsByOrderId.get((order as { id: number }).id) ?? [],
    })),
    page,
    page_size: pageSize,
    total: count ?? 0,
  }
}

async function updateOrder(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, body: JsonRecord) {
  if (!ORDER_EDIT_ROLES.has(context.role)) {
    return jsonResponse({ ok: false, error: 'You do not have permission to edit orders.' }, 403)
  }

  const orderId = Number(body.id)
  if (!Number.isFinite(orderId)) {
    return jsonResponse({ ok: false, error: 'Order id is missing.' }, 422)
  }

  const { data: existingOrder, error: existingError } = await supabaseAdmin
    .from('orders')
    .select('id, store_slug')
    .eq('id', orderId)
    .maybeSingle()

  if (existingError || !existingOrder) {
    return jsonResponse({ ok: false, error: 'Order was not found.' }, 404)
  }

  if (!isSuperAdmin(context) && context.store_slug && existingOrder.store_slug !== context.store_slug) {
    return jsonResponse({ ok: false, error: 'You can only update orders from your own store.' }, 403)
  }

  const patch = {
    status: normalizeNullableString(body.status) ?? undefined,
    payment_status: normalizeNullableString(body.payment_status) ?? undefined,
    fulfillment_status: normalizeNullableString(body.fulfillment_status) ?? undefined,
    notes: body.notes === '' ? null : normalizeNullableString(body.notes),
    tracking_number: body.tracking_number === '' ? null : normalizeNullableString(body.tracking_number),
    tracking_url: body.tracking_url === '' ? null : normalizeNullableString(body.tracking_url),
  }

  const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(cleanPatch)
    .eq('id', orderId)
    .select('id, order_code, status, payment_status, fulfillment_status, notes, tracking_number, tracking_url, updated_at')
    .single()

  if (error) {
    return jsonResponse({ ok: false, error: 'Order could not be updated.' }, 500)
  }

  return jsonResponse({ ok: true, row: data })
}

async function listRepairs(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, filters: JsonRecord) {
  const page = clampPage(filters.page, 1)
  const pageSize = clampPageSize(filters.page_size, 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const scopedStoreSlug = isSuperAdmin(context) ? normalizeNullableString(filters.store_slug) : context.store_slug
  const search = String(filters.search ?? '').trim()

  let query = supabaseAdmin
    .from('repair_bookings')
    .select('id, booking_code, store_slug, repair_category, brand, device_model, issue_description, preferred_date, preferred_time, customer_name, phone, email, status, admin_notes, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (scopedStoreSlug) query = query.eq('store_slug', scopedStoreSlug)
  const status = normalizeNullableString(filters.status)
  if (status) query = query.eq('status', status)
  if (search) {
    const safe = search.replace(/[%*,]/g, ' ').trim()
    query = query.or(`booking_code.ilike.%${safe}%,customer_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%,device_model.ilike.%${safe}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    rows: data ?? [],
    page,
    page_size: pageSize,
    total: count ?? 0,
  }
}

async function updateRepair(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, body: JsonRecord) {
  if (!REPAIR_EDIT_ROLES.has(context.role)) {
    return jsonResponse({ ok: false, error: 'You do not have permission to edit repair bookings.' }, 403)
  }

  const bookingId = Number(body.id)
  if (!Number.isFinite(bookingId)) {
    return jsonResponse({ ok: false, error: 'Repair booking id is missing.' }, 422)
  }

  const { data: existingBooking, error: existingError } = await supabaseAdmin
    .from('repair_bookings')
    .select('id, store_slug')
    .eq('id', bookingId)
    .maybeSingle()

  if (existingError || !existingBooking) {
    return jsonResponse({ ok: false, error: 'Repair booking was not found.' }, 404)
  }

  if (!isSuperAdmin(context) && context.store_slug && existingBooking.store_slug !== context.store_slug) {
    return jsonResponse({ ok: false, error: 'You can only update repair bookings from your own store.' }, 403)
  }

  const patch = {
    status: normalizeNullableString(body.status) ?? undefined,
    admin_notes: body.admin_notes === '' ? null : normalizeNullableString(body.admin_notes),
    preferred_date: body.preferred_date === '' ? null : normalizeNullableString(body.preferred_date),
    preferred_time: body.preferred_time === '' ? null : normalizeNullableString(body.preferred_time),
  }

  const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))
  const { data, error } = await supabaseAdmin
    .from('repair_bookings')
    .update(cleanPatch)
    .eq('id', bookingId)
    .select('id, booking_code, status, admin_notes, preferred_date, preferred_time, updated_at')
    .single()

  if (error) {
    return jsonResponse({ ok: false, error: 'Repair booking could not be updated.' }, 500)
  }

  return jsonResponse({ ok: true, row: data })
}

async function listCustomers(supabaseAdmin: ReturnType<typeof createClient>, _context: AdminContext, filters: JsonRecord) {
  const page = clampPage(filters.page, 1)
  const pageSize = clampPageSize(filters.page_size, 25, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const search = String(filters.search ?? '').trim()

  let query = supabaseAdmin
    .from('customer_contacts')
    .select('id, contact_key, auth_user_id, first_name, last_name, full_name, email, email_normalized, phone_primary, phone_secondary, phone_other, company, business_name, abn_crn, labels, address_line_1, address_line_2, suburb, state, postcode, country, email_subscriber_status, sms_subscriber_status, source, imported_at, updated_at', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (search) {
    const safe = search.replace(/[%*,]/g, ' ').trim()
    query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,full_name.ilike.%${safe}%,email.ilike.%${safe}%,phone_primary.ilike.%${safe}%,phone_secondary.ilike.%${safe}%,phone_other.ilike.%${safe}%,company.ilike.%${safe}%,business_name.ilike.%${safe}%`)
  }

  const emailStatus = normalizeNullableString(filters.email_status)
  if (emailStatus) query = query.eq('email_subscriber_status', normalizeMarketingStatus(emailStatus))

  const smsStatus = normalizeNullableString(filters.sms_status)
  if (smsStatus) query = query.eq('sms_subscriber_status', normalizeMarketingStatus(smsStatus))

  const { data, error, count } = await query
  if (error) throw error

  return {
    rows: data ?? [],
    page,
    page_size: pageSize,
    total: count ?? 0,
    can_edit: CUSTOMER_EDIT_ROLES.has(_context.role),
  }
}

function buildCustomerPatch(input: JsonRecord, existingEmail?: string | null, existingPhone?: string | null) {
  const firstName = normalizeNullableString(input.first_name)
  const lastName = normalizeNullableString(input.last_name)
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || normalizeNullableString(input.full_name)
  const normalizedEmail = normalizeEmail(input.email)
  const emailInput = normalizeNullableString(input.email)
  const primaryPhone = normalizePhone(input.phone_primary)

  return {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    email: normalizedEmail ?? emailInput,
    email_normalized: normalizedEmail,
    phone_primary: primaryPhone,
    phone_secondary: normalizePhone(input.phone_secondary),
    phone_other: normalizePhone(input.phone_other),
    company: normalizeNullableString(input.company),
    business_name: normalizeNullableString(input.business_name),
    abn_crn: normalizeNullableString(input.abn_crn),
    labels: normalizeNullableString(input.labels),
    address_line_1: normalizeNullableString(input.address_line_1),
    address_line_2: normalizeNullableString(input.address_line_2),
    suburb: normalizeNullableString(input.suburb),
    state: normalizeNullableString(input.state),
    postcode: normalizeNullableString(input.postcode),
    country: normalizeNullableString(input.country) ?? 'AU',
    email_subscriber_status: normalizeMarketingStatus(input.email_subscriber_status),
    sms_subscriber_status: normalizeMarketingStatus(input.sms_subscriber_status),
    source: normalizeNullableString(input.source) ?? 'Admin',
    contact_key: getCustomerContactKey(normalizedEmail ?? existingEmail ?? null, primaryPhone ?? existingPhone ?? null),
  }
}

async function createCustomer(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, body: JsonRecord) {
  if (!CUSTOMER_EDIT_ROLES.has(context.role)) {
    return jsonResponse({ ok: false, error: 'Only super admins can create customers.' }, 403)
  }

  const customer = (body.customer ?? {}) as JsonRecord
  const patch = buildCustomerPatch(customer)
  if (!patch.first_name && !patch.last_name && !patch.email_normalized && !patch.phone_primary) {
    return jsonResponse({ ok: false, error: 'Enter at least a name, email or phone number.' }, 422)
  }

  const { data, error } = await supabaseAdmin
    .from('customer_contacts')
    .insert({
      ...patch,
      raw_data: { source: 'admin-panel' },
    })
    .select('id, first_name, last_name, full_name, email, phone_primary, updated_at')
    .single()

  if (error) {
    return jsonResponse({ ok: false, error: error.code === '23505' ? 'A customer with this email or phone already exists.' : 'Customer could not be created.' }, 500)
  }

  return jsonResponse({ ok: true, row: data })
}

async function updateCustomer(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, body: JsonRecord) {
  if (!CUSTOMER_EDIT_ROLES.has(context.role)) {
    return jsonResponse({ ok: false, error: 'Only super admins can update customers.' }, 403)
  }

  const customerId = Number(body.id)
  if (!Number.isFinite(customerId)) {
    return jsonResponse({ ok: false, error: 'Customer id is missing.' }, 422)
  }

  const { data: existingRow, error: existingError } = await supabaseAdmin
    .from('customer_contacts')
    .select('id, email_normalized, phone_primary')
    .eq('id', customerId)
    .maybeSingle()

  if (existingError || !existingRow) {
    return jsonResponse({ ok: false, error: 'Customer was not found.' }, 404)
  }

  const customer = (body.customer ?? {}) as JsonRecord
  const patch = buildCustomerPatch(customer, existingRow.email_normalized, existingRow.phone_primary)
  if (!patch.first_name && !patch.last_name && !patch.email_normalized && !patch.phone_primary) {
    return jsonResponse({ ok: false, error: 'Enter at least a name, email or phone number.' }, 422)
  }

  const { data, error } = await supabaseAdmin
    .from('customer_contacts')
    .update(patch)
    .eq('id', customerId)
    .select('id, first_name, last_name, full_name, email, phone_primary, updated_at')
    .single()

  if (error) {
    return jsonResponse({ ok: false, error: 'Customer could not be updated.' }, 500)
  }

  return jsonResponse({ ok: true, row: data })
}

async function deleteCustomer(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, body: JsonRecord) {
  if (!CUSTOMER_EDIT_ROLES.has(context.role)) {
    return jsonResponse({ ok: false, error: 'Only super admins can delete customers.' }, 403)
  }

  const customerId = Number(body.id)
  if (!Number.isFinite(customerId)) {
    return jsonResponse({ ok: false, error: 'Customer id is missing.' }, 422)
  }

  const { error } = await supabaseAdmin
    .from('customer_contacts')
    .delete()
    .eq('id', customerId)

  if (error) {
    return jsonResponse({ ok: false, error: 'Customer could not be deleted.' }, 500)
  }

  return jsonResponse({ ok: true })
}

async function listProducts(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, filters: JsonRecord) {
  const page = clampPage(filters.page, 1)
  const pageSize = clampPageSize(filters.page_size, 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const search = String(filters.search ?? '').trim()

  let query = supabaseAdmin
    .from('products')
    .select('id, sku, slug, name, brand, model, category_id, short_description, detail_html, retail_price, compare_at_price, cost_price, stock_quantity, is_visible, is_featured, image_url, compatibility, updated_at, created_at', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to)

  const categoryId = normalizeNumber(filters.category_id)
  if (categoryId !== null) query = query.eq('category_id', categoryId)

  const visibility = normalizeNullableString(filters.visibility)
  if (visibility === 'visible') query = query.eq('is_visible', true)
  if (visibility === 'hidden') query = query.eq('is_visible', false)

  const featured = normalizeNullableString(filters.featured)
  if (featured === 'featured') query = query.eq('is_featured', true)

  if (search) {
    const safe = search.replace(/[%*,]/g, ' ').trim()
    query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%,slug.ilike.%${safe}%,brand.ilike.%${safe}%,model.ilike.%${safe}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  const productIds = (data ?? []).map((row) => (row as { id: number }).id)
  const { data: imageRows, error: imageError } = productIds.length
    ? await supabaseAdmin
        .from('product_images')
        .select('id, product_id, image_url, alt_text, sort_order, created_at')
        .in('product_id', productIds)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true })
    : { data: [] as unknown[], error: null }

  if (imageError) throw imageError

  const imagesByProductId = new Map<number, unknown[]>()
  ;(imageRows ?? []).forEach((image) => {
    const productId = (image as { product_id: number }).product_id
    const images = imagesByProductId.get(productId) ?? []
    images.push(image)
    imagesByProductId.set(productId, images)
  })

  return {
    rows: (data ?? []).map((row) => ({
      ...row,
      images: imagesByProductId.get((row as { id: number }).id) ?? [],
    })),
    page,
    page_size: pageSize,
    total: count ?? 0,
    can_edit: CATALOG_EDIT_ROLES.has(context.role),
  }
}

async function updateProduct(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, body: JsonRecord) {
  if (!CATALOG_EDIT_ROLES.has(context.role)) {
    return jsonResponse({ ok: false, error: 'Only super admins can update products.' }, 403)
  }

  const productId = Number(body.id)
  if (!Number.isFinite(productId)) {
    return jsonResponse({ ok: false, error: 'Product id is missing.' }, 422)
  }

  const imagesInput = Array.isArray(body.images) ? body.images : null
  const normalizedImages = imagesInput
    ? imagesInput
        .map((image, index) => ({
          product_id: productId,
          image_url: normalizeNullableString((image as JsonRecord).image_url),
          alt_text: normalizeNullableString((image as JsonRecord).alt_text),
          sort_order: index,
        }))
        .filter((image) => image.image_url)
    : null

  const heroImageUrl = normalizedImages?.[0]?.image_url ?? normalizeNullableString(body.image_url)

  const patch = {
    name: normalizeNullableString(body.name),
    brand: normalizeNullableString(body.brand),
    model: normalizeNullableString(body.model),
    category_id: normalizeNumber(body.category_id),
    short_description: body.short_description === '' ? null : normalizeNullableString(body.short_description),
    compatibility: body.compatibility === '' ? null : normalizeNullableString(body.compatibility),
    retail_price: normalizeNumber(body.retail_price),
    compare_at_price: normalizeNumber(body.compare_at_price),
    cost_price: normalizeNumber(body.cost_price),
    stock_quantity: normalizeNumber(body.stock_quantity),
    is_visible: typeof body.is_visible === 'boolean' ? body.is_visible : undefined,
    is_featured: typeof body.is_featured === 'boolean' ? body.is_featured : undefined,
    image_url: heroImageUrl,
    detail_html: body.detail_html === '' ? null : String(body.detail_html ?? ''),
  }

  const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))
  const { data, error } = await supabaseAdmin
    .from('products')
    .update(cleanPatch)
    .eq('id', productId)
    .select('id, sku, slug, name, brand, model, category_id, short_description, retail_price, compare_at_price, cost_price, stock_quantity, is_visible, is_featured, image_url, compatibility, updated_at')
    .single()

  if (error) {
    return jsonResponse({ ok: false, error: 'Product could not be updated.' }, 500)
  }

  if (normalizedImages) {
    const { error: deleteImagesError } = await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('product_id', productId)

    if (deleteImagesError) {
      return jsonResponse({ ok: false, error: 'Product images could not be updated.' }, 500)
    }

    if (normalizedImages.length) {
      const { error: insertImagesError } = await supabaseAdmin
        .from('product_images')
        .insert(normalizedImages)

      if (insertImagesError) {
        return jsonResponse({ ok: false, error: 'Product images could not be saved.' }, 500)
      }
    }
  }

  return jsonResponse({ ok: true, row: data })
}

async function uploadProductDetailImage(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, body: JsonRecord) {
  if (!CATALOG_EDIT_ROLES.has(context.role)) {
    return jsonResponse({ ok: false, error: 'Only super admins can upload product images.' }, 403)
  }

  const productId = Number(body.product_id)
  if (!Number.isFinite(productId)) {
    return jsonResponse({ ok: false, error: 'Product id is missing.' }, 422)
  }

  const bytes = decodeBase64ToBytes(body.data_base64)
  if (!bytes || bytes.byteLength === 0) {
    return jsonResponse({ ok: false, error: 'Image data is missing.' }, 422)
  }

  if (bytes.byteLength > 8 * 1024 * 1024) {
    return jsonResponse({ ok: false, error: 'Image is too large. Please use a file under 8MB.' }, 422)
  }

  const contentType = String(body.content_type ?? '').trim().toLowerCase()
  if (!contentType.startsWith('image/')) {
    return jsonResponse({ ok: false, error: 'Only image files can be uploaded.' }, 422)
  }

  const extensionInput = String(body.extension ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  const extension = ['webp', 'png', 'jpg', 'jpeg', 'gif'].includes(extensionInput)
    ? (extensionInput === 'jpeg' ? 'jpg' : extensionInput)
    : (contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg')
  const productSlug = normalizeStorageSegment(body.product_slug, `product-${productId}`)
  const randomSuffix = crypto.randomUUID().slice(0, 8)
  const storagePath = `product-details/${productSlug}/${Date.now()}-${randomSuffix}.${extension}`

  const { error: uploadError } = await supabaseAdmin
    .storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: false,
    })

  if (uploadError) {
    return jsonResponse({ ok: false, error: 'Product detail image could not be uploaded.' }, 500)
  }

  const { data: publicData } = supabaseAdmin
    .storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(storagePath)

  return jsonResponse({
    ok: true,
    bucket: PRODUCT_IMAGE_BUCKET,
    storage_path: storagePath,
    public_url: publicData.publicUrl,
  })
}

async function listInventory(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, filters: JsonRecord) {
  const page = clampPage(filters.page, 1)
  const pageSize = clampPageSize(filters.page_size, 25, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const sharedLists = await getSharedLists(supabaseAdmin)
  const requestedStoreSlug = normalizeNullableString(filters.store_slug)
  const effectiveStoreSlug = isSuperAdmin(context) ? requestedStoreSlug : context.store_slug

  let scopedStoreId: number | null = null
  if (effectiveStoreSlug) {
    const store = sharedLists.stores.find((item) => item.slug === effectiveStoreSlug)
    if (store) scopedStoreId = store.id
  }

  let productIds: number[] | null = null
  const search = String(filters.search ?? '').trim()
  if (search) {
    const safe = search.replace(/[%*,]/g, ' ').trim()
    const { data: matchedProducts } = await supabaseAdmin
      .from('products')
      .select('id')
      .or(`name.ilike.%${safe}%,sku.ilike.%${safe}%,brand.ilike.%${safe}%`)
      .limit(100)
    productIds = (matchedProducts ?? []).map((item) => (item as { id: number }).id)
    if (!productIds.length) {
      return { rows: [], page, page_size: pageSize, total: 0 }
    }
  }

  let query = supabaseAdmin
    .from('product_store_inventory')
    .select('id, product_id, store_id, quantity, shelf_location, updated_at', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (scopedStoreId) query = query.eq('store_id', scopedStoreId)
  if (productIds?.length) query = query.in('product_id', productIds)
  if (filters.low_stock_only === true) query = query.lte('quantity', 5)

  const { data, error, count } = await query
  if (error) throw error

  const productIdList = Array.from(new Set((data ?? []).map((row) => (row as { product_id: number }).product_id)))
  const storeIdList = Array.from(new Set((data ?? []).map((row) => (row as { store_id: number }).store_id)))

  const [{ data: products }, { data: stores }] = await Promise.all([
    productIdList.length
      ? supabaseAdmin.from('products').select('id, sku, name, brand, image_url, stock_quantity, is_visible').in('id', productIdList)
      : Promise.resolve({ data: [] as unknown[] }),
    storeIdList.length
      ? supabaseAdmin.from('stores').select('id, slug, name').in('id', storeIdList)
      : Promise.resolve({ data: [] as unknown[] }),
  ])

  const productsById = new Map((products ?? []).map((item) => [(item as { id: number }).id, item]))
  const storesById = new Map((stores ?? []).map((item) => [(item as { id: number }).id, item]))

  return {
    rows: (data ?? []).map((row) => ({
      ...row,
      product: productsById.get((row as { product_id: number }).product_id) ?? null,
      store: storesById.get((row as { store_id: number }).store_id) ?? null,
    })),
    page,
    page_size: pageSize,
    total: count ?? 0,
    can_edit: INVENTORY_EDIT_ROLES.has(context.role),
  }
}

async function refreshProductStock(supabaseAdmin: ReturnType<typeof createClient>, productId: number) {
  const { data: rows } = await supabaseAdmin
    .from('product_store_inventory')
    .select('quantity')
    .eq('product_id', productId)

  const stockTotal = Number((rows ?? []).reduce((sum, row) => sum + (Number((row as { quantity?: number }).quantity) || 0), 0))
  await supabaseAdmin
    .from('products')
    .update({ stock_quantity: stockTotal })
    .eq('id', productId)
}

async function updateInventory(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, body: JsonRecord) {
  if (!INVENTORY_EDIT_ROLES.has(context.role)) {
    return jsonResponse({ ok: false, error: 'You do not have permission to edit inventory.' }, 403)
  }

  const inventoryId = Number(body.id)
  if (!Number.isFinite(inventoryId)) {
    return jsonResponse({ ok: false, error: 'Inventory row id is missing.' }, 422)
  }

  const { data: existingRow, error: existingError } = await supabaseAdmin
    .from('product_store_inventory')
    .select('id, product_id, store_id')
    .eq('id', inventoryId)
    .maybeSingle()

  if (existingError || !existingRow) {
    return jsonResponse({ ok: false, error: 'Inventory row was not found.' }, 404)
  }

  if (!isSuperAdmin(context) && context.store_slug) {
    const { data: storeRow } = await supabaseAdmin
      .from('stores')
      .select('id, slug')
      .eq('id', existingRow.store_id)
      .maybeSingle()

    if (!storeRow || storeRow.slug !== context.store_slug) {
      return jsonResponse({ ok: false, error: 'You can only update inventory in your own store.' }, 403)
    }
  }

  const quantity = normalizeNumber(body.quantity)
  if (quantity === null) {
    return jsonResponse({ ok: false, error: 'Inventory quantity is invalid.' }, 422)
  }

  const { data, error } = await supabaseAdmin
    .from('product_store_inventory')
    .update({
      quantity,
      shelf_location: body.shelf_location === '' ? null : normalizeNullableString(body.shelf_location),
    })
    .eq('id', inventoryId)
    .select('id, product_id, store_id, quantity, shelf_location, updated_at')
    .single()

  if (error) {
    return jsonResponse({ ok: false, error: 'Inventory row could not be updated.' }, 500)
  }

  await refreshProductStock(supabaseAdmin, data.product_id)

  return jsonResponse({ ok: true, row: data })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'Supabase admin service is not configured.' }, 500)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { error: authError, context } = await getAdminContext(supabaseAdmin, req)
    if (authError || !context) return authError

    const body = (await req.json()) as JsonRecord
    const action = String(body.action ?? '').trim()
    const sharedLists = await getSharedLists(supabaseAdmin)

    if (action === 'bootstrap') {
      return jsonResponse({
        ok: true,
        admin: context,
        capabilities: {
          can_edit_orders: ORDER_EDIT_ROLES.has(context.role),
          can_edit_repairs: REPAIR_EDIT_ROLES.has(context.role),
          can_edit_products: CATALOG_EDIT_ROLES.has(context.role),
          can_edit_inventory: INVENTORY_EDIT_ROLES.has(context.role),
          can_edit_customers: CUSTOMER_EDIT_ROLES.has(context.role),
          can_view_all_stores: isSuperAdmin(context),
        },
        stores: sharedLists.stores,
        categories: sharedLists.categories,
      })
    }

    if (action === 'dashboard') {
      const dashboard = await getDashboardData(supabaseAdmin, context)
      return jsonResponse({ ok: true, ...dashboard, stores: sharedLists.stores })
    }

    if (action === 'orders_list') {
      const result = await listOrders(supabaseAdmin, context, body.filters as JsonRecord ?? {})
      return jsonResponse({ ok: true, ...result, stores: sharedLists.stores })
    }

    if (action === 'order_update') {
      return await updateOrder(supabaseAdmin, context, body)
    }

    if (action === 'repairs_list') {
      const result = await listRepairs(supabaseAdmin, context, body.filters as JsonRecord ?? {})
      return jsonResponse({ ok: true, ...result, stores: sharedLists.stores })
    }

    if (action === 'repair_update') {
      return await updateRepair(supabaseAdmin, context, body)
    }

    if (action === 'customers_list') {
      const result = await listCustomers(supabaseAdmin, context, body.filters as JsonRecord ?? {})
      return jsonResponse({ ok: true, ...result })
    }

    if (action === 'customer_create') {
      return await createCustomer(supabaseAdmin, context, body)
    }

    if (action === 'customer_update') {
      return await updateCustomer(supabaseAdmin, context, body)
    }

    if (action === 'customer_delete') {
      return await deleteCustomer(supabaseAdmin, context, body)
    }

    if (action === 'products_list') {
      const result = await listProducts(supabaseAdmin, context, body.filters as JsonRecord ?? {})
      return jsonResponse({ ok: true, ...result, categories: sharedLists.categories })
    }

    if (action === 'product_update') {
      return await updateProduct(supabaseAdmin, context, body)
    }

    if (action === 'product_detail_image_upload') {
      return await uploadProductDetailImage(supabaseAdmin, context, body)
    }

    if (action === 'inventory_list') {
      const result = await listInventory(supabaseAdmin, context, body.filters as JsonRecord ?? {})
      return jsonResponse({ ok: true, ...result, stores: sharedLists.stores })
    }

    if (action === 'inventory_update') {
      return await updateInventory(supabaseAdmin, context, body)
    }

    return jsonResponse({ ok: false, error: 'Unknown admin action.' }, 400)
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Admin panel request failed.',
      },
      500,
    )
  }
})
