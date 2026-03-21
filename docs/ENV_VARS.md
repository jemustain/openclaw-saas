# Environment Variables Reference

Complete reference for all environment variables used by HandsOff.

## Required Variables

| Variable | Description | Where to get it | Example |
|----------|-------------|-----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase → Settings → API | `https://abc123def.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase → Settings → API | `eyJhbGciOiJIUzI1NiIs...` |
| `STRIPE_SECRET_KEY` | Stripe secret API key | Stripe → Developers → API keys | `sk_test_51abc...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Stripe → Developers → API keys | `pk_test_51abc...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Stripe → Developers → Webhooks → endpoint → Signing secret | `whsec_abc123...` |
| `STRIPE_PRICE_STARTER` | Price ID for Starter plan ($12/mo) | Stripe → Products → HandsOff Starter → Price ID | `price_1abc...` |
| `STRIPE_PRICE_PRO` | Price ID for Pro plan ($25/mo) | Stripe → Products → HandsOff Pro → Price ID | `price_1def...` |
| `DO_API_TOKEN` | DigitalOcean API token (read/write) | DigitalOcean → API → Generate New Token | `dop_v1_abc123...` |
| `RESEND_API_KEY` | Resend email API key | Resend → API Keys | `re_abc123...` |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | Your domain / Vercel URL | `https://handsoff.yourdomain.com` |
| `CRON_SECRET` | Secret for authenticating cron job endpoints | Generate: `openssl rand -hex 32` | `a1b2c3d4e5f6...` |

## Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Runtime environment | `development` | `production` |

## Notes

- **Test vs Live keys:** Stripe provides both test and live keys. Use `sk_test_` / `pk_test_` for development and `sk_live_` / `pk_live_` for production.
- **`NEXT_PUBLIC_` prefix:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secret keys behind this prefix.
- **Local development:** Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in your values.
