import {
  isStripeProfileAvailable,
  parseStripePaymentConfiguration,
  stripeCheckoutPaymentMethodOptions,
  stripeCheckoutPaymentMethodTypes,
} from "./stripe-payment-methods.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
  );
}

const configurationPayload = {
  data: [{
    id: "pmc_default",
    active: true,
    is_default: true,
    livemode: true,
    card: {
      available: true,
      display_preference: { preference: "on", value: "on" },
    },
    link: {
      available: true,
      display_preference: { preference: "on", value: "on" },
    },
    afterpay_clearpay: {
      available: true,
      display_preference: { preference: "on", value: "on" },
    },
    klarna: {
      available: true,
      display_preference: { preference: "on", value: "on" },
    },
    zip: {
      available: false,
      display_preference: { preference: "on", value: "on" },
    },
    wechat_pay: {
      available: true,
      display_preference: { preference: "on", value: "on" },
    },
  }],
};

Deno.test("uses the active default Stripe payment configuration", () => {
  const configuration = parseStripePaymentConfiguration(configurationPayload);
  assert(
    configuration.id === "pmc_default",
    "default configuration should be selected",
  );
  assert(configuration.livemode, "live mode should be preserved");
  assert(
    isStripeProfileAvailable(configuration, "klarna"),
    "Klarna should be available",
  );
  assert(
    !isStripeProfileAvailable(configuration, "zip"),
    "unavailable Zip should stay hidden",
  );
});

Deno.test("groups card wallets and Link into the card checkout option", () => {
  const configuration = parseStripePaymentConfiguration(configurationPayload);
  const types = stripeCheckoutPaymentMethodTypes(configuration, "card");
  assert(types.join(",") === "card,link", "card checkout should include Link");
});

Deno.test("rejects a Stripe method that is enabled in settings but unavailable to the account", () => {
  const configuration = parseStripePaymentConfiguration(configurationPayload);
  let rejected = false;
  try {
    stripeCheckoutPaymentMethodTypes(configuration, "zip");
  } catch {
    rejected = true;
  }
  assert(
    rejected,
    "unavailable Zip should be rejected before checkout creation",
  );
});

Deno.test("sets the required web client option for WeChat Pay checkout", () => {
  assertEquals(stripeCheckoutPaymentMethodOptions("wechat_pay"), {
    wechat_pay: { client: "web" },
  });
  assertEquals(stripeCheckoutPaymentMethodOptions("card"), undefined);
});
