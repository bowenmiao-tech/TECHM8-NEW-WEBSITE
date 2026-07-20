import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import {
  isStripeProfileAvailable,
  loadStripePaymentConfiguration,
  STRIPE_CHECKOUT_PROFILE_CODES,
} from "../_shared/stripe-payment-methods.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed." }, {
      status: 405,
      headers: corsHeaders,
    });
  }

  const stripeSecretKey = String(Deno.env.get("STRIPE_SECRET_KEY") ?? "")
    .trim();
  if (!stripeSecretKey) {
    return Response.json({ ok: false, error: "Stripe is not configured." }, {
      status: 503,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const requestedCodes = ["pay_in_store", ...STRIPE_CHECKOUT_PROFILE_CODES];
    const [{ data: profiles, error: profilesError }, stripeConfiguration] =
      await Promise.all([
        supabaseAdmin
          .from("payment_fee_profiles")
          .select(
            "code,label,provider,fee_type,percentage,fixed_amount,sort_order,notes",
          )
          .in("code", requestedCodes)
          .order("sort_order", { ascending: true }),
        loadStripePaymentConfiguration(stripeSecretKey),
      ]);
    if (profilesError) throw profilesError;

    const availableProfiles = (profiles ?? []).filter((profile) => {
      if (profile.code === "pay_in_store") return profile.provider === "manual";
      return profile.provider === "stripe" &&
        STRIPE_CHECKOUT_PROFILE_CODES.includes(profile.code) &&
        isStripeProfileAvailable(stripeConfiguration, profile.code);
    }).map((profile) => ({ ...profile, is_enabled: true }));

    return Response.json({
      ok: true,
      profiles: availableProfiles,
      stripe_configuration_id: stripeConfiguration.id,
      livemode: stripeConfiguration.livemode,
    }, {
      status: 200,
      headers: { ...corsHeaders, "Cache-Control": "public, max-age=60" },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Payment methods could not be loaded." },
      { status: 503, headers: corsHeaders },
    );
  }
});
