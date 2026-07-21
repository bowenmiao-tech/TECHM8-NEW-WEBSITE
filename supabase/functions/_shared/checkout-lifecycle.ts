export type CheckoutLifecycleState = {
  payment_status?: unknown;
  status?: unknown;
  fulfillment_status?: unknown;
};

export function canAbandonExpiredCheckout(order: CheckoutLifecycleState) {
  return String(order.payment_status ?? "") === "pending" &&
    String(order.status ?? "") === "submitted" &&
    String(order.fulfillment_status ?? "") === "new";
}

export function buildExpiredCheckoutTransition(
  checkoutSessionId: string,
  stripeEventId: string,
  expiredAt: string,
) {
  const sessionId = String(checkoutSessionId ?? "").trim();
  const eventId = String(stripeEventId ?? "").trim();
  const timestamp = String(expiredAt ?? "").trim();
  if (
    !sessionId || !eventId || !timestamp || Number.isNaN(Date.parse(timestamp))
  ) {
    throw new Error("Expired checkout transition identifiers are invalid.");
  }

  return {
    orderPatch: {
      payment_status: "expired",
      status: "abandoned",
      fulfillment_status: "not_started",
      checkout_expired_at: timestamp,
      cancelled_at: null,
      cancel_reason: null,
    },
    event: {
      eventKey: `checkout_abandoned:${sessionId}`,
      eventType: "checkout_abandoned",
      title: "Checkout expired",
      description:
        "The Stripe Checkout session expired before payment was completed.",
      actor: { type: "stripe" as const, identifier: eventId },
      data: { reason: "stripe_checkout_expired" },
    },
  };
}
