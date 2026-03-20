# Implementation Plan: OpenClaw as a Service — MVP

**Branch**: `001-ocaas-mvp` | **Date**: 2026-03-19 | **Spec**: specs/mvp/spec.md

## Summary

Build a managed hosting platform where non-technical users sign up, connect
messaging/productivity accounts via guided wizards, and get a fully configured
OpenClaw instance on an isolated VM. Portal built with Next.js on Vercel,
VMs provisioned via Hetzner Cloud API, billing via Stripe.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 14+ App Router)
**Primary Dependencies**: Next.js, Tailwind CSS, Clerk (auth), Supabase JS, Stripe SDK, Hetzner Cloud SDK
**Storage**: Supabase (PostgreSQL) for portal data; VM-local storage for OpenClaw data
**Testing**: Vitest (unit), Playwright (E2E onboarding flow)
**Target Platform**: Vercel (portal), Hetzner Cloud (user VMs)
**Project Type**: Web application (portal) + infrastructure automation
**Performance Goals**: Portal pages <2s p95, provisioning <3 min
**Constraints**: Each user = isolated VM, no shared compute
**Scale/Scope**: MVP targets first 100 users

## Constitution Check

| Principle | Status |
|-----------|--------|
| Zero-CLI UX | ✅ All config via portal GUI |
| Isolation by Default | ✅ Dedicated Hetzner VM per user |
| One-Click Integrations | ✅ OAuth + guided wizards |
| Resilience & Self-Healing | ✅ Health checks + auto-restart |
| Transparent Pricing | ✅ Stripe with clear plan display |
| Graceful Degradation | ✅ Per-integration status tracking |

## Project Structure

### Documentation

```text
specs/mvp/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task breakdown
```

### Source Code (monorepo)

```text
apps/
├── web/                 # Next.js portal + marketing site
│   ├── app/
│   │   ├── (marketing)/     # Landing page, pricing, about
│   │   ├── (portal)/        # Dashboard, onboarding, settings
│   │   │   ├── dashboard/
│   │   │   ├── onboarding/
│   │   │   ├── integrations/
│   │   │   ├── billing/
│   │   │   └── settings/
│   │   ├── api/             # API routes
│   │   │   ├── instances/
│   │   │   ├── integrations/
│   │   │   ├── webhooks/    # Stripe, health checks
│   │   │   └── provisioning/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/              # Shared UI (shadcn/ui)
│   │   ├── onboarding/      # Wizard steps
│   │   ├── dashboard/       # Status cards, service indicators
│   │   └── marketing/       # Hero, pricing table, CTA
│   ├── lib/
│   │   ├── supabase.ts      # DB client
│   │   ├── hetzner.ts       # VM provisioning
│   │   ├── stripe.ts        # Billing helpers
│   │   ├── sidecar.ts       # Instance config push API
│   │   └── health.ts        # Health check logic
│   └── public/
│       └── images/
│
├── sidecar/             # Lightweight API running on each VM
│   ├── index.ts         # Express/Fastify server
│   ├── routes/
│   │   ├── health.ts    # GET /health
│   │   ├── config.ts    # POST /config (push openclaw.json updates)
│   │   └── restart.ts   # POST /restart
│   └── auth.ts          # Bearer token validation

packages/
├── shared/              # Shared types, constants
│   ├── types.ts
│   └── constants.ts

infra/
├── packer/              # VM image template
│   └── openclaw.pkr.hcl
├── cloud-init/          # Instance bootstrap script
│   └── user-data.yaml
└── scripts/
    ├── build-image.sh
    └── provision.sh
```

**Structure Decision**: Monorepo with `apps/web` (portal) and `apps/sidecar`
(VM agent), plus `infra/` for VM image builds. Keeps portal and instance-side
code in one repo for easy iteration.

## Key Architecture Decisions

### VM Provisioning Flow
1. User completes onboarding wizard
2. Portal calls Hetzner API → create server from pre-built snapshot
3. cloud-init runs on first boot: configures OpenClaw, starts sidecar
4. Sidecar reports healthy → portal marks instance as "running"
5. Portal pushes integration configs via sidecar API

### Sidecar API (no SSH)
Each VM runs a lightweight HTTP API (port 8787, authenticated via instance
token stored in Supabase). Portal pushes config changes here instead of SSH.
Endpoints: `GET /health`, `POST /config`, `POST /restart`, `GET /logs`.

### Pre-built VM Images
Packer builds a Hetzner snapshot with:
- Ubuntu 24.04 LTS
- Node.js, OpenClaw pre-installed and configured
- Sidecar pre-installed as systemd service
- Firewall: only 443 (sidecar TLS) + outbound

## Complexity Tracking

No constitution violations identified.
