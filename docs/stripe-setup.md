# Stripe Setup for ShiftWorker

## 1. Create a Stripe Account

Sign up at [stripe.com](https://stripe.com) and enable **Test mode**.

## 2. Create Products & Prices

In the Stripe Dashboard → **Products**, create two products:

| Product | Price  | Billing            |
| ------- | ------ | ------------------ |
| Starter | $12/mo | Recurring, monthly |
| Pro     | $25/mo | Recurring, monthly |

Copy each **Price ID** (starts with `price_`).

## 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
STRIPE_SECRET_KEY=sk_test_...          # Settings → API keys
STRIPE_WEBHOOK_SECRET=whsec_...        # See step 4
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_STARTER=price_...         # Starter price ID
STRIPE_PRICE_PRO=price_...             # Pro price ID
```

## 4. Set Up Webhooks

### Local development

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret it prints and set `STRIPE_WEBHOOK_SECRET`.

### Production

In Stripe Dashboard → **Developers → Webhooks**, add an endpoint:

- **URL:** `https://your-domain.com/api/stripe/webhook`
- **Events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

## 5. Enable Customer Portal

In Stripe Dashboard → **Settings → Billing → Customer Portal**, enable it and configure allowed actions (cancel, switch plans, update payment method).

## Tiers

| Tier    | Price  | Stripe Product |
| ------- | ------ | -------------- |
| Free    | $0     | None           |
| Starter | $12/mo | Required       |
| Pro     | $25/mo | Required       |
