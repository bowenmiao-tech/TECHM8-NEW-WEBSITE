import {
  DEFAULT_MAX_CART_QUANTITY,
  EVERYDAY_ACCESSORY_MAX_CART_QUANTITY,
  getInvalidCartQuantity,
  getMaxCartQuantity,
  isValidCartQuantity,
} from './cart-quantity.ts'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

Deno.test('keeps the default cart quantity limit at 99', () => {
  const item = { slug: 'another-product', qty: DEFAULT_MAX_CART_QUANTITY }
  assert(isValidCartQuantity(item), '99 should remain valid for ordinary products')
  assert(
    !isValidCartQuantity({ ...item, qty: DEFAULT_MAX_CART_QUANTITY + 1 }),
    'ordinary products must still reject 100',
  )
})

Deno.test('allows only TECHM8 Everyday Accessory up to 9999', () => {
  const item = {
    slug: 'techm8-everyday-accessory',
    qty: EVERYDAY_ACCESSORY_MAX_CART_QUANTITY,
  }
  assert(
    getMaxCartQuantity(item) === EVERYDAY_ACCESSORY_MAX_CART_QUANTITY,
    'the requested product should use the 9999 limit',
  )
  assert(isValidCartQuantity(item), '9999 should be accepted for the requested product')
  assert(
    !isValidCartQuantity({
      ...item,
      qty: EVERYDAY_ACCESSORY_MAX_CART_QUANTITY + 1,
    }),
    'the requested product must reject 10000',
  )
})

Deno.test('requires positive whole-number quantities', () => {
  assert(
    !isValidCartQuantity({ slug: 'techm8-everyday-accessory', qty: 1.5 }),
    'decimal quantities must be rejected',
  )
  assert(
    !isValidCartQuantity({ slug: 'techm8-everyday-accessory', qty: 0 }),
    'zero must be rejected',
  )
  assert(
    getInvalidCartQuantity([
      { slug: 'techm8-everyday-accessory', qty: 9999 },
      { slug: 'another-product', qty: 100 },
    ])?.slug === 'another-product',
    'validation should identify the first invalid cart line',
  )
})
