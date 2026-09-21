export const DEFAULT_MAX_CART_QUANTITY = 99
export const EVERYDAY_ACCESSORY_MAX_CART_QUANTITY = 9999
export const EVERYDAY_ACCESSORY_SLUG = 'techm8-everyday-accessory'
// A second-hand device is one physical thing: its slug starts with `used-`.
export const USED_DEVICE_SLUG_PREFIX = 'used-'

export type CartQuantityInput = {
  slug?: string | null
  qty?: number | string | null
}

export function getMaxCartQuantity(item: Pick<CartQuantityInput, 'slug'>) {
  const slug = String(item.slug ?? '').trim().toLowerCase()
  if (slug.startsWith(USED_DEVICE_SLUG_PREFIX)) return 1
  return slug === EVERYDAY_ACCESSORY_SLUG
    ? EVERYDAY_ACCESSORY_MAX_CART_QUANTITY
    : DEFAULT_MAX_CART_QUANTITY
}

export function isValidCartQuantity(item: CartQuantityInput) {
  const quantity = Number(item.qty)
  return Number.isInteger(quantity)
    && quantity >= 1
    && quantity <= getMaxCartQuantity(item)
}

export function getInvalidCartQuantity(items: CartQuantityInput[]) {
  return items.find((item) => !isValidCartQuantity(item)) ?? null
}
