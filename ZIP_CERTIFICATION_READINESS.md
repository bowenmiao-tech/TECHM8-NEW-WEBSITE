# OZ TECH M8 - Zip Web Checkout Certification Readiness

Status: **integration complete, production checkout disabled pending Zip certification**

Merchant ID: `57849`

Production website: `https://www.techm8australia.com/`

## Integration design

- Direct Zip Web Checkout API integration (not Stripe).
- Hosted Zip checkout redirect with an OZ TECH M8 order reference.
- Immediate capture is used (`capture: true`); separate authorisation/capture is not required for this retail flow.
- Australian dollars only.
- Store pickup and Australian shipping are supported.
- No customer surcharge is applied to Zip.

## Implemented certification items

- Approved, declined, referred and cancelled return outcomes.
- Return checkout ID, order reference, currency and amount verification.
- Stable idempotency keys for checkout creation, charge creation and refunds.
- `Zip-Version: 2021-08-25` on every Zip API request.
- Four-attempt, 60-second retry window for transient Zip errors.
- Charge Error/manual reconciliation state after an ambiguous charge response.
- Item-level product data, product URL, image URL and a dedicated shipping line item.
- Full and partial refunds with duplicate-pending-refund protection.
- Zip checkout ID, charge ID, receipt, state and environment in the admin order record.
- Zip receipt number on the English invoice.
- Three-party order/invoice email workflow: customer, selected fulfilment store and central OZ TECH M8 contact.
- Pickup packing slip and A6 pickup label; shipping packing slip and A6 shipping label.
- Admin emergency Zip enable/disable control. Production enablement is blocked unless `ZIP_CERTIFIED` is recorded.
- Official Zip landing-page placement, product/cart price widgets and footer payment icon are ready behind the public-key marketing flag.

## Sandbox evidence still required

Run these cases in an isolated staging environment after Sandbox credentials are supplied:

1. Cancelled order and return to website.
2. Existing Zip Pay customer approved checkout.
3. Existing Zip Money customer approved checkout.
4. New Zip Money approved outcome.
5. New Zip Money referred outcome.
6. New Zip Money declined outcome.
7. Full refund.
8. Partial refund.
9. Confirm transaction and item data in Zip Merchant Centre.
10. Verify landing page, footer icon, product widget and cart widget using the Sandbox Public Key.

Discount data is not applicable because the current OZ TECH M8 checkout does not support coupons or order discounts.

## Required from Zip / merchant before UAT

- Sandbox Private Key.
- Sandbox Public Key.
- Confirmation of the staging URL and certification contact/process.
- Confirmation that immediate capture is accepted for this merchant flow.

## Production release gate

After Zip confirms certification:

1. Configure the certified Production Private Key and Public Key.
2. Set the frontend widget environment to `production` and enable Zip marketing assets.
3. Record `ZIP_CERTIFIED=true` in Supabase.
4. Publish the frontend through the approved deployment process.
5. Enable Zip from the admin payment control.
6. Place one controlled production order, verify the invoice/email/receipt, then test a controlled refund.
