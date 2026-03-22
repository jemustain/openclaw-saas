# ShiftWorker — Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              ShiftWorker Portal                 │
│         (Next.js on Vercel — FREE)           │
│                                              │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐  │
│  │  Setup    │ │   Skill   │ │  Health    │  │
│  │  Wizard   │ │Marketplace│ │ Dashboard  │  │
│  └────┬─────┘ └─────┬─────┘ └─────┬──────┘  │
│       │              │             │          │
│  ┌────┴──────────────┴─────────────┴──────┐  │
│  │        Provisioning Engine             │  │
│  │  (Serverless Functions on Vercel)      │  │
│  └────┬──────────────┬─────────────┬──────┘  │
└───────┼──────────────┼─────────────┼─────────┘
        │              │             │
   ┌────▼────┐   ┌─────▼────┐  ┌────▼─────┐
   │ Digital  │   │  (future) │  │ (future) │
   │ Ocean API│   │  Hetzner  │  │  Vultr   │
   └────┬────┘   └─────┬────┘  └────┬─────┘
        │              │             │
   ┌────▼──────────────▼─────────────▼──────┐
   │         User's Own VPS                 │
   │  ┌─────────────────────────────────┐   │
   │  │  OpenClaw + Sidecar Agent       │   │
   │  │  (installed via cloud-init)     │   │
   │  └─────────────────────────────────┘   │
   └────────────────────────────────────────┘
```

## Key Insight: Zero Backend Costs

Because we don't host anything, the entire portal can run on:
- **Vercel Free Tier** — Next.js frontend + serverless API routes
- **Supabase Free Tier** — Auth + database (50K monthly active users)
- **No servers to manage** — all provisioning is API calls to user's provider

Total infrastructure cost to run ShiftWorker: **$0/mo** until significant scale.

## Tech Stack

| Component | Technology | Cost |
|---|---|---|
| Frontend | Next.js 15 + Tailwind | Free (Vercel) |
| Auth | Clerk or Supabase Auth | Free tier |
| Database | Supabase (PostgreSQL) | Free tier |
| Payments | Stripe | 2.9% + $0.30/txn |
| Provisioning | Vercel Serverless Functions | Free tier (100K/mo) |
| VPS APIs | DigitalOcean REST API (Hetzner/Vultr planned) | Free |
| Sidecar Agent | Lightweight HTTP agent on user VPS | Bundled |
| Monitoring | Sidecar heartbeat → Supabase | Free |

## Provisioning Flow (Technical)

1. User pastes VPS provider API key into wizard
2. Vercel serverless function calls provider API:
   - Create SSH key pair (ephemeral, for setup only)
   - Create VPS (smallest plan, user's chosen region)
   - Inject cloud-init script that:
     - Installs Node.js + OpenClaw
     - Installs sidecar agent (for remote management)
     - Generates secure credentials
     - Opens only required ports
3. Poll VPS until cloud-init completes (~3-5 min)
4. Return credentials to user
5. **Delete SSH key** — we never retain server access
6. All future management goes through sidecar agent (HTTPS, bearer token)

## Sidecar Agent

Lightweight HTTP service running on user's VPS:
- **Port:** 8787 (HTTPS, self-signed or Let's Encrypt)
- **Auth:** Bearer token (generated during setup, stored in user's dashboard)
- **Endpoints:**
  - `GET /health` — server status, CPU, RAM, uptime
  - `GET /openclaw/status` — OpenClaw version, running state
  - `POST /openclaw/restart` — restart OpenClaw
  - `POST /openclaw/update` — pull latest OpenClaw + restart
  - `POST /skills/install` — install a skill from marketplace
  - `GET /skills/list` — list installed skills

## Project Structure

```
apps/
  web/              # Next.js portal (Vercel)
    src/
      app/
        page.tsx              # Landing page
        spec/                 # Spec viewer
        wizard/               # Setup wizard pages
        dashboard/            # User dashboard
        marketplace/          # Skill marketplace
      lib/
        providers/            # DigitalOcean (primary), Hetzner/Vultr (planned)
        provisioning/         # Cloud-init templates, setup logic
        sidecar/              # Sidecar API client
  sidecar/            # Sidecar agent (deployed to user VPS)
    src/
      index.ts
      routes/
infra/
  cloud-init/         # Cloud-init templates per provider
  packer/             # (optional) Pre-built images
specs/
  mvp/
    spec.md
    plan.md
    tasks.md
```

## Security Model

- **We never store VPS API keys** — used once during setup, then discarded
- **We never retain SSH access** — keys deleted after provisioning
- **Sidecar token** — stored encrypted in Supabase, only accessible by the user
- **All sidecar communication** — HTTPS with bearer auth
- **Provisioning scripts are open source** — users can audit exactly what gets installed
- **User can revoke access anytime** — just change the sidecar token or shut it down

## Competitive Advantages

| Us (ShiftWorker) | EZClaw / OpenClawd.ai | Emergent / Moltbot |
|---|---|---|
| User owns server | They own server | They own everything |
| $0 to run the platform | Infrastructure costs | VC-funded burn |
| Free core product | Paid hosting | Paid platform |
| Open source scripts | Black box | Black box |
| Provider agnostic | Single provider | Proprietary |
| Community-driven | Company-driven | Company-driven |
| Privacy by architecture | Trust-based privacy | Trust-based privacy |
