# ShiftWorker

**AI agent hosting platform.** ShiftWorker provisions and manages [OpenClaw](https://github.com/openclaw/openclaw) instances for users — it handles servers, configuration, and infrastructure so you can focus on having an AI assistant that actually helps. Sign up, connect your services, and start chatting.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Portal | Next.js 14, Tailwind CSS, Vercel |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Billing | Stripe |
| VM Hosting | DigitalOcean |
| Email | Resend |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/jemustain/openclaw-saas.git
cd openclaw-saas

# Install dependencies
cd apps/web
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values (see docs/SETUP.md)

# Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setup

For the full setup guide (Supabase, Stripe, DigitalOcean, Resend, Vercel, domain config), see **[docs/SETUP.md](docs/SETUP.md)**.

For environment variable reference, see **[docs/ENV_VARS.md](docs/ENV_VARS.md)**.

To verify your setup:

```bash
chmod +x scripts/setup-check.sh
./scripts/setup-check.sh
```

## Project Structure

```
apps/
  web/          → Next.js frontend + API routes
  sidecar/      → Sidecar service
supabase/
  migrations/   → Database schema
scripts/
  setup-check.sh → Setup validation script
docs/
  SETUP.md      → Full setup guide
  ENV_VARS.md   → Environment variable reference
```

## License

Private — All rights reserved.
