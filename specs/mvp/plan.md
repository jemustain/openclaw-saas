# Claw4All — Implementation Plan

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│              Claw4All Portal                      │
│         (Next.js on Vercel — FREE tier)           │
│                                                   │
│  ┌───────────┐ ┌────────────┐ ┌───────────────┐  │
│  │  Signup +  │ │   User     │ │   Skill       │  │
│  │  Onboard   │ │ Dashboard  │ │  Library      │  │
│  └─────┬─────┘ └──────┬─────┘ └──────┬────────┘  │
│        │               │              │           │
│  ┌─────┴───────────────┴──────────────┴────────┐  │
│  │         VM Orchestration Layer              │  │
│  │    (Vercel Serverless + Background Jobs)    │  │
│  └─────┬──────────────────────────┬────────────┘  │
└────────┼──────────────────────────┼───────────────┘
         │                          │
    ┌────▼─────┐             ┌──────▼───────┐
    │ Hetzner  │             │   Stripe     │
    │ API      │             │   Billing    │
    │ (our     │             └──────────────┘
    │ account) │
    └────┬─────┘
         │
    ┌────▼──────────────────────────────────┐
    │    Claw4All-Managed VM Pool           │
    │                                        │
    │  ┌──────────┐ ┌──────────┐ ┌────────┐ │
    │  │ User A's │ │ User B's │ │User C's│ │
    │  │ OpenClaw │ │ OpenClaw │ │OpenClaw│ │
    │  └──────────┘ └──────────┘ └────────┘ │
    └───────────────────────────────────────┘
```

## Key Architecture Decisions

### We Own the Infrastructure
- Single Hetzner account, provisioned via API with our credentials
- Each user gets a dedicated VM (isolation, security, simplicity)
- We manage lifecycle: create, monitor, update, suspend, destroy
- User never sees or accesses the VM directly

### Why Dedicated VMs (Not Shared/Containers)
- OpenClaw expects a full Linux environment (browser, system tools)
- Full isolation between users — no noisy neighbor, no data leaks
- Simple ops: one VM = one user = one OpenClaw instance
- Can migrate to containers later if economics demand it

## Tech Stack

| Component | Technology | Cost |
|---|---|---|
| Frontend | Next.js 15 + Tailwind | Free (Vercel) |
| Auth | Supabase Auth | Free tier |
| Database | Supabase (PostgreSQL) | Free tier |
| Payments | Stripe Subscriptions | 2.9% + $0.30/txn |
| VM Provisioning | Hetzner Cloud API | ~$5/user/mo |
| VM Management | Sidecar agent on each VM | Bundled |
| Background Jobs | Vercel Cron or Inngest | Free tier |
| AI API Keys | Our keys, metered per user | ~$3-8/user/mo |

## Provisioning Flow

1. User clicks "Launch my assistant"
2. Serverless function calls Hetzner API:
   - Create CX22 VM (2 vCPU, 4GB RAM, 40GB disk)
   - Inject cloud-init script that installs OpenClaw + sidecar agent
   - Tag VM with user ID
3. Sidecar agent phones home when ready (~60-90 sec)
4. Portal marks assistant as "online"
5. User connects messaging app via guided flow
6. Assistant is live

## Sidecar Agent (on each user VM)

Internal management agent — user never interacts with it directly.

- **Phones home** to Claw4All API on startup and via heartbeat
- **Endpoints** (called by our orchestration layer only):
  - `GET /health` — VM and OpenClaw status
  - `POST /openclaw/restart` — restart OpenClaw
  - `POST /openclaw/update` — update to latest version
  - `POST /skills/install` — install/enable a skill
  - `POST /skills/remove` — remove a skill
  - `POST /messaging/setup` — configure messaging bridge
- **Auth:** mTLS or shared secret (internal only, not user-facing)

## Billing Integration

- **Stripe Subscriptions** for recurring billing
- **Free tier:** VM runs on schedule (8h/day), suspended outside hours
- **Paid tier:** VM runs 24/7
- **Overdue payments:** assistant suspended after grace period, VM kept for 30 days, then destroyed
- **Metering:** track message count and AI API usage per user for future usage-based billing

## VM Lifecycle

| State | Description |
|---|---|
| `provisioning` | VM being created, cloud-init running |
| `active` | Online and serving the user |
| `suspended` | Paused (free tier off-hours, or overdue payment) |
| `destroying` | Being torn down (user cancelled, account deleted) |

## Project Structure

```
apps/
  web/                    # Next.js portal (Vercel)
    src/
      app/
        page.tsx                # Landing page
        dashboard/              # User dashboard
        onboarding/             # Post-signup messaging setup
        skills/                 # Skill library
      lib/
        hetzner/                # Hetzner API client
        orchestration/          # VM lifecycle management
        sidecar-client/         # Talk to sidecar agents
        billing/                # Stripe integration
  sidecar/                # Sidecar agent (deployed to every VM)
infra/
  cloud-init/             # Cloud-init templates
specs/
  mvp/
```

## Security Model

- **User data isolation:** one VM per user, no shared resources
- **No user SSH access:** users never see or touch their VM
- **Sidecar auth:** mTLS or rotating secrets, not user-facing
- **AI API keys:** our keys stored encrypted, never exposed to users
- **Hetzner API key:** single admin key, stored in Vercel env vars, never exposed
- **Data retention:** user cancels → VM destroyed after 30-day grace → data gone
- **Compliance:** no user data stored on our portal beyond account info; all personal data lives on their isolated VM

## Competitive Positioning

| | Claw4All | Self-hosted OpenClaw | Competitor SaaS |
|---|---|---|---|
| Setup time | 60 seconds | 30+ minutes | Varies |
| Technical skill needed | None | Moderate | Low-Moderate |
| Data isolation | Dedicated VM | Full control | Shared infra |
| Cost | $12-25/mo | $5-10/mo + your time | $20-50/mo |
| Maintenance | We handle it | You handle it | They handle it |
