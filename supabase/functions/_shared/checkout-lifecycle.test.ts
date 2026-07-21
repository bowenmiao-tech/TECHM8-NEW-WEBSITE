import {
  buildExpiredCheckoutTransition,
  canAbandonExpiredCheckout,
} from "./checkout-lifecycle.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("only untouched pending checkouts may transition to abandoned", () => {
  assert(
    canAbandonExpiredCheckout({
      payment_status: "pending",
      status: "submitted",
      fulfillment_status: "new",
    }),
    "an untouched pending checkout should be eligible",
  );
  assert(
    !canAbandonExpiredCheckout({
      payment_status: "paid",
      status: "confirmed",
      fulfillment_status: "queued",
    }),
    "a paid order must never be abandoned",
  );
  assert(
    !canAbandonExpiredCheckout({
      payment_status: "pending",
      status: "cancelled",
      fulfillment_status: "cancelled",
    }),
    "a real cancellation must not be overwritten",
  );
});

Deno.test("expired checkout transition is separate from cancellation and failure", () => {
  const expiredAt = "2026-07-21T05:30:00.000Z";
  const transition = buildExpiredCheckoutTransition(
    "cs_live_123",
    "evt_123",
    expiredAt,
  );

  assert(
    transition.orderPatch.status === "abandoned",
    "order should be abandoned",
  );
  assert(
    transition.orderPatch.payment_status === "expired",
    "payment should be expired",
  );
  assert(
    transition.orderPatch.fulfillment_status === "not_started",
    "fulfilment should not start",
  );
  assert(
    transition.orderPatch.checkout_expired_at === expiredAt,
    "expiry timestamp should be preserved",
  );
  assert(
    transition.orderPatch.cancelled_at === null,
    "expiry must not set a cancellation timestamp",
  );
  assert(
    transition.orderPatch.cancel_reason === null,
    "expiry must not set a cancellation reason",
  );
  assert(
    transition.event.eventType === "checkout_abandoned",
    "event should be checkout-specific",
  );
  assert(
    transition.event.eventKey === "checkout_abandoned:cs_live_123",
    "event should be idempotent",
  );
});
