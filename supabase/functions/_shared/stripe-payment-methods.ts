import Stripe from "npm:stripe@16.12.0";

export const STRIPE_CHECKOUT_PROFILE_CODES = [
  "card",
  "afterpay_clearpay",
  "klarna",
  "zip",
  "wechat_pay",
] as const;

export type StripeCheckoutProfileCode =
  typeof STRIPE_CHECKOUT_PROFILE_CODES[number];

type JsonRecord = Record<string, unknown>;

export type StripePaymentMethodStatus = {
  available: boolean;
  enabled: boolean;
  preference: string | null;
  value: string | null;
};

export type StripePaymentConfiguration = {
  id: string;
  livemode: boolean;
  methods: Record<string, StripePaymentMethodStatus>;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" ? value as JsonRecord : {};
}

function nullableText(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function methodStatus(
  configuration: JsonRecord,
  key: string,
): StripePaymentMethodStatus {
  const method = record(configuration[key]);
  const displayPreference = record(method.display_preference);
  const preference = nullableText(displayPreference.preference);
  const value = nullableText(displayPreference.value);
  const available = method.available === true;
  return {
    available,
    enabled: available && value === "on",
    preference,
    value,
  };
}

export function parseStripePaymentConfiguration(
  payload: unknown,
): StripePaymentConfiguration {
  const data = Array.isArray(record(payload).data)
    ? record(payload).data as JsonRecord[]
    : [];
  const configuration =
    data.find((item) => item.active === true && item.is_default === true) ??
      data.find((item) => item.active === true) ??
      data[0];
  if (!configuration) {
    throw new Error("No active Stripe payment method configuration was found.");
  }

  const methodKeys = [
    "card",
    "link",
    "afterpay_clearpay",
    "klarna",
    "zip",
    "wechat_pay",
  ];
  return {
    id: String(configuration.id ?? "").trim(),
    livemode: configuration.livemode === true,
    methods: Object.fromEntries(
      methodKeys.map((key) => [key, methodStatus(configuration, key)]),
    ),
  };
}

export async function loadStripePaymentConfiguration(stripeSecretKey: string) {
  const response = await fetch(
    "https://api.stripe.com/v1/payment_method_configurations?limit=100",
    {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Stripe-Version": "2024-09-30.acacia",
      },
      signal: AbortSignal.timeout(8_000),
    },
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      String(
        payload?.error?.message ||
          "Stripe payment method settings could not be loaded.",
      ),
    );
  }
  return parseStripePaymentConfiguration(payload);
}

export function isStripeProfileAvailable(
  configuration: StripePaymentConfiguration,
  code: string,
) {
  if (code === "card") return configuration.methods.card?.enabled === true;
  return configuration.methods[code]?.enabled === true;
}

export function stripeCheckoutPaymentMethodTypes(
  configuration: StripePaymentConfiguration,
  code: StripeCheckoutProfileCode,
): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  if (!isStripeProfileAvailable(configuration, code)) {
    throw new Error(
      `Stripe payment method ${code} is not currently available.`,
    );
  }
  if (code === "card") {
    return configuration.methods.link?.enabled === true
      ? ["card", "link"]
      : ["card"];
  }
  return [code];
}

export function stripeCheckoutPaymentMethodOptions(
  code: StripeCheckoutProfileCode,
): Stripe.Checkout.SessionCreateParams.PaymentMethodOptions | undefined {
  if (code !== "wechat_pay") return undefined;
  return {
    wechat_pay: {
      client: "web",
    },
  };
}
