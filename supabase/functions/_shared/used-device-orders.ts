// Second-hand devices in a website order.
//
// A used device is one physical thing in one store, so an order has to claim it
// before the customer pays. The website database holds it against the order
// (claim_used_devices_for_order), and the POS is told, so the same device cannot
// be sold at the counter meanwhile. If either says no, the order is not placed.
//
// Nothing here does anything for an order without a used device in it.

import Stripe from 'npm:stripe@16.12.0'
import { recordOrderEvent } from './order-commerce.ts'

type SupabaseAdmin = any
type JsonRecord = Record<string, unknown>

// A used device's slug starts with this; the cart and checkout read it as "one only".
export const USED_DEVICE_SLUG_PREFIX = 'used-'
const DEFAULT_POS_FUNCTIONS_URL = 'https://abkjbhmifswfexpjkval.supabase.co/functions/v1'

// Something the customer can act on: the device sold, someone else is paying
// for it, the price moved. The message is written for them.
export class UsedDeviceOrderError extends Error {}

export function isUsedDeviceSlug(slug: unknown) {
  return String(slug ?? '').trim().toLowerCase().startsWith(USED_DEVICE_SLUG_PREFIX)
}

export type UsedDeviceClaim = {
  orderCode: string
  holdKind: string
  holdUntil: string | null
  devices: Array<{ device_code: string; title: string }>
}

// The database writes "USED_DEVICE_HELD: <what the customer should read>".
function customerMessage(message: unknown) {
  const match = /USED_DEVICE_[A-Z]+:\s*([\s\S]+)$/.exec(String(message ?? ''))
  return match ? match[1].trim() : ''
}

async function pos(body: JsonRecord) {
  const secret = Deno.env.get('USED_DEVICE_PUBLISH_SECRET') ?? ''
  const baseUrl = (Deno.env.get('POS_FUNCTIONS_URL') ?? DEFAULT_POS_FUNCTIONS_URL).replace(/\/+$/, '')
  if (!secret) throw new Error('Second-hand device orders are not configured.')
  const response = await fetch(`${baseUrl}/used-device-online-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-publish-secret': secret },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  const data = await response.json().catch(() => ({}))
  return { ok: response.ok && data?.ok !== false, status: response.status, data: data as JsonRecord }
}

// The same customer's own unfinished checkout for these devices: they went back
// from the payment page. Its payment page is closed before this order goes any
// further, so they can never pay twice for one device.
async function closeSupersededCheckouts(supabaseAdmin: SupabaseAdmin, superseded: JsonRecord[]) {
  const closed: string[] = []
  if (!superseded.length) return closed
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2024-06-20' }) : null
  for (const previous of superseded) {
    const orderCode = String(previous.order_code ?? '')
    const sessionId = String(previous.stripe_checkout_session_id ?? '').trim()
    if (sessionId) {
      if (!stripe) {
        throw new UsedDeviceOrderError(`Your earlier checkout (order ${orderCode}) is still open. Please finish it, or try again in 30 minutes.`)
      }
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session.status === 'complete') {
        throw new UsedDeviceOrderError(`You have already paid for this device in order ${orderCode}.`)
      }
      if (session.status === 'open') await stripe.checkout.sessions.expire(sessionId)
    }
    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'expired',
        status: 'abandoned',
        fulfillment_status: 'not_started',
        checkout_expired_at: new Date().toISOString(),
      })
      .eq('id', previous.order_id)
      .eq('payment_status', 'pending')
      .is('stripe_payment_intent_id', null)
    if (error) throw error
    try {
      await recordOrderEvent(supabaseAdmin, Number(previous.order_id), {
        eventKey: 'checkout_replaced',
        eventType: 'checkout_abandoned',
        title: 'Checkout replaced',
        description: 'The customer started a new checkout for the same second-hand device, so this one was closed.',
        actor: { type: 'system', identifier: 'used-device-orders' },
      })
    } catch (eventError) {
      console.error('Replaced checkout event could not be recorded.', eventError)
    }
    closed.push(orderCode)
  }
  return closed
}

// Called once the order and its lines are saved. Returns null when the order
// has no second-hand device. Throws UsedDeviceOrderError when the customer
// cannot have one; the caller then deletes the order.
export async function claimUsedDevicesForOrder(
  supabaseAdmin: SupabaseAdmin,
  order: { id: number; orderCode: string; customerName: string; fulfillmentMethod: string; storeSlug: string },
): Promise<UsedDeviceClaim | null> {
  const { data, error } = await supabaseAdmin.rpc('claim_used_devices_for_order', { target_order_id: order.id })
  if (error) {
    const message = customerMessage(error.message)
    if (message) throw new UsedDeviceOrderError(message)
    throw error
  }
  const devices = (Array.isArray(data?.devices) ? data.devices : []) as Array<{ device_code: string; title: string }>
  if (!devices.length) return null

  const superseded = (Array.isArray(data.superseded) ? data.superseded : []) as JsonRecord[]
  const replaces = await closeSupersededCheckouts(supabaseAdmin, superseded)

  let answer
  try {
    answer = await pos({
      action: 'hold',
      order_code: order.orderCode,
      hold_kind: data.hold_kind,
      hold_until: data.hold_until,
      device_codes: devices.map((device) => device.device_code),
      replaces,
      fulfillment_method: order.fulfillmentMethod,
      store_slug: order.storeSlug,
      customer_name: order.customerName,
    })
  } catch (posError) {
    console.error('The POS could not be asked to reserve used devices.', posError)
    throw new UsedDeviceOrderError('We could not confirm your second-hand device is still available. Please try again in a moment.')
  }
  if (!answer.ok) {
    console.error('The POS refused to reserve used devices.', answer.status, answer.data)
    const message = String(answer.data.message ?? '')
    const device = devices.find((entry) => message.includes(entry.device_code))
    if (answer.status === 409 && device) {
      throw new UsedDeviceOrderError(`${device.title} has just been sold in store. Please remove it from your cart.`)
    }
    throw new UsedDeviceOrderError('We could not confirm your second-hand device is still available. Please try again in a moment.')
  }

  return {
    orderCode: order.orderCode,
    holdKind: String(data.hold_kind ?? ''),
    holdUntil: data.hold_until ? String(data.hold_until) : null,
    devices,
  }
}

// Payment could not be opened for an order that had already reserved. The
// order is deleted by the caller, which frees the device on the website; this
// frees it in the POS straight away instead of when the reservation lapses.
export async function releaseUsedDevicesForOrder(orderCode: string) {
  try {
    const answer = await pos({ action: 'release', order_code: orderCode, reason: 'Payment could not be started' })
    if (!answer.ok) console.error('Used device reservation could not be released.', answer.status, answer.data)
  } catch (error) {
    console.error('Used device reservation could not be released.', error)
  }
}
