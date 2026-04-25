import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const STORE_SORT_ORDER = ['park-ridge', 'fairfield', 'toowong', 'north-lakes', 'brassall', 'warehouse-dispatch']
const SUPER_ADMIN_ROLE = 'super_admin'
const CATALOG_EDIT_ROLES = new Set([SUPER_ADMIN_ROLE])
const ORDER_EDIT_ROLES = new Set([SUPER_ADMIN_ROLE, 'store_manager', 'staff'])
const REPAIR_EDIT_ROLES = new Set([SUPER_ADMIN_ROLE, 'store_manager', 'staff'])
const INVENTORY_EDIT_ROLES = new Set([SUPER_ADMIN_ROLE, 'store_manager'])

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

async function listProducts(supabaseAdmin: ReturnType<typeof createClient>, context: AdminContext, filters: JsonRecord) {
  const page = clampPage(filters.page, 1)
  const pageSize = clampPageSize(filters.page_size, 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const search = String(filters.search ?? '').trim()

  let query = supabaseAdmin
    .from('products')
    .select('id, sku, slug, name, brand, model, category_id, short_description, retail_price, compare_at_price, cost_price, stock_quantity, is_visible, is_featured, image_url, compatibility, updated_at, created_at', { count: 'exact' })
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

  return {
    rows: data ?? [],
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
    image_url: body.image_url === '' ? null : normalizeNullableString(body.image_url),
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

  return jsonResponse({ ok: true, row: data })
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

    if (action === 'products_list') {
      const result = await listProducts(supabaseAdmin, context, body.filters as JsonRecord ?? {})
      return jsonResponse({ ok: true, ...result, categories: sharedLists.categories })
    }

    if (action === 'product_update') {
      return await updateProduct(supabaseAdmin, context, body)
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
