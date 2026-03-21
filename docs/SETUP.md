# HandsOff Setup Guide

Complete step-by-step instructions for setting up all external services needed to run HandsOff.

> **Prerequisites:** A GitHub account, a credit card for Stripe/DigitalOcean, and ~30 minutes.

---

## 1. Supabase (Database + Auth)

Supabase provides the PostgreSQL database and authentication layer.

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose an organization (or create one), name the project (e.g., `handsoff`), set a strong database password, and pick a region close to your users
3. Wait for the project to finish provisioning (~2 minutes)

### Get your API credentials

4. Go to **Settings → API** (left sidebar)
5. Copy the **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
6. Copy the **anon / public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Run the database migration

7. Go to **SQL Editor** (left sidebar)
8. Click **New query**
9. Paste the entire contents of [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql)
10. Click **Run** — you should see "Success. No rows returned."

### Configure Auth

11. Go to **Authentication → URL Configuration**
12. Set **Site URL** to your Vercel deployment URL (e.g., `https://handsoff.yourdomain.com`)
13. Add `http://localhost:3000` to **Redirect URLs** for local development

### Env vars from this step

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL (e.g., `https://abc123.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon/public key |

---

## 2. Stripe (Payments)

Stripe handles subscriptions and billing.

1. Go to [stripe.com](https://stripe.com) → create an account (or sign in)
2. Complete onboarding if prompted

### Create products

3. Go to **Dashboard → Products → + Add product**
4. Create the first product:
   - **Name:** `HandsOff Starter`
   - **Pricing:** `$12.00` / month (recurring)
   - Click **Save product**
   - Copy the **Price ID** (starts with `price_`) → this is `STRIPE_PRICE_STARTER`
5. Create the second product:
   - **Name:** `HandsOff Pro`
   - **Pricing:** `$25.00` / month (recurring)
   - Click **Save product**
   - Copy the **Price ID** → this is `STRIPE_PRICE_PRO`

### Get API keys

6. Go to **Developers → API keys**
7. Copy the **Publishable key** (`pk_test_...`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
8. Copy the **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`

### Set up webhooks

9. Go to **Developers → Webhooks → + Add endpoint**
10. Set the **Endpoint URL** to: `https://YOUR-DOMAIN/api/stripe/webhook`
11. Under **Events to send**, select:
    - `checkout.session.completed`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_failed`
12. Click **Add endpoint**
13. On the endpoint page, click **Reveal** under Signing secret → this is `STRIPE_WEBHOOK_SECRET`

> **Tip:** For local development, use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks:
> ```bash
> stripe listen --forward-to localhost:3000/api/stripe/webhook
> ```

### Env vars from this step

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `STRIPE_PRICE_STARTER` | `price_...` (Starter product) |
| `STRIPE_PRICE_PRO` | `price_...` (Pro product) |

---

## 3. DigitalOcean (VM Hosting)

DigitalOcean provides the virtual machines (Droplets) where user OpenClaw instances run.

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com) → create an account
2. Create a new project called **HandsOff** (or similar)
3. Go to **API** in the left sidebar
4. Click **Generate New Token**
   - Name: `handsoff-api`
   - Expiration: No expiry (or set as needed)
   - Scopes: **Read & Write**
5. Copy the token immediately (it's only shown once) → `DO_API_TOKEN`

### Env vars from this step

| Variable | Value |
|----------|-------|
| `DO_API_TOKEN` | Your DigitalOcean API token |

> **Note:** Hetzner support is planned for a future release.

---

## 4. Resend (Email)

Resend handles transactional emails (welcome emails, notifications, etc.).

1. Go to [resend.com](https://resend.com) → create an account
2. Go to **API Keys** in the sidebar
3. Click **Create API Key**
   - Name: `handsoff`
   - Permission: **Full access** (or Sending access if you prefer)
4. Copy the key → `RESEND_API_KEY`

> **Optional:** To send from a custom domain, go to **Domains → Add Domain** and follow the DNS verification steps.

### Env vars from this step

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | `re_...` |

---

## 5. Vercel (Deployment)

1. Go to [vercel.com](https://vercel.com) → import the `openclaw-saas` repository
2. Set the **Root Directory** to `apps/web`
3. Go to **Settings → Environment Variables**
4. Add every env var from the sections above, plus:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` (your production URL) |
| `CRON_SECRET` | A random string — generate with: `openssl rand -hex 32` |

5. Deploy!

---

## 6. Domain

1. Register a domain at [Namecheap](https://namecheap.com), [Cloudflare](https://cloudflare.com), or any registrar
2. In Vercel: go to your project → **Settings → Domains → Add**
3. Enter your domain name
4. Update your DNS records at your registrar as Vercel instructs (typically a CNAME or A record)
5. Wait for DNS propagation (usually a few minutes, up to 48 hours)
6. Go back to Supabase → **Authentication → URL Configuration** → update the Site URL to your new domain

---

## Quick Checklist

- [ ] Supabase project created, migration run, auth configured
- [ ] Stripe products created, API keys copied, webhook set up
- [ ] DigitalOcean project created, API token generated
- [ ] Resend account created, API key generated
- [ ] All env vars added to Vercel
- [ ] Domain configured and DNS propagated
- [ ] Run `scripts/setup-check.sh` to verify everything ✅

---

## Troubleshooting

### "Invalid API key" errors
Double-check you're using the correct key type (test vs live for Stripe, anon vs service_role for Supabase).

### Webhooks not arriving
- Ensure the webhook URL matches your actual domain exactly
- Check the Stripe webhook logs at **Developers → Webhooks → [your endpoint] → Attempts**
- For local dev, make sure `stripe listen` is running

### Database migration fails
- Make sure you're pasting the entire SQL file contents
- Check the Supabase SQL Editor output for specific error messages
