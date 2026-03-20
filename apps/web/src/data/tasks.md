# Tasks: OpenClaw as a Service — MVP

**Input**: specs/mvp/plan.md, specs/mvp/spec.md
**Prerequisites**: Plan and spec complete

## Phase 1: Setup

- [ ] T001 Initialize monorepo with `apps/web` (Next.js 14, App Router, Tailwind, TypeScript)
- [ ] T002 [P] Set up Clerk auth with Google social login in `apps/web`
- [ ] T003 [P] Set up Supabase project + create initial schema (users, instances, integrations, subscriptions tables)
- [ ] T004 [P] Configure Stripe products: Free Trial, Starter ($15/mo), Pro ($35/mo)
- [ ] T005 [P] Install shadcn/ui component library
- [ ] T006 [P] Set up environment variables template (`.env.example`)
- [ ] T007 [P] Configure Vercel project for `apps/web` with preview deployments

---

## Phase 2: Foundational

- [ ] T008 Create Supabase schema migrations:
  - `users` (id, clerk_id, email, created_at)
  - `instances` (id, user_id, hetzner_id, ip, status, region, openclaw_version, sidecar_token, created_at)
  - `integrations` (id, instance_id, type, status, oauth_tokens_encrypted, last_health_check)
  - `subscriptions` (id, user_id, stripe_sub_id, plan, status, trial_ends_at)
- [ ] T009 [P] Create `lib/supabase.ts` — typed Supabase client with Row types
- [ ] T010 [P] Create `lib/hetzner.ts` — wrapper for Hetzner Cloud API (createServer, deleteServer, getStatus, listSnapshots)
- [ ] T011 [P] Create `lib/stripe.ts` — helpers for checkout session, portal session, webhook handling
- [ ] T012 [P] Create `lib/sidecar.ts` — typed HTTP client for instance sidecar API (pushConfig, checkHealth, restart)
- [ ] T013 Create `apps/sidecar/` — lightweight Fastify server with bearer auth
  - `GET /health` returns OpenClaw process status + uptime
  - `POST /config` accepts partial openclaw.json updates, validates, applies, restarts OpenClaw
  - `POST /restart` restarts OpenClaw process
  - `GET /logs` returns last 100 lines of OpenClaw logs
- [ ] T014 [P] Create `infra/packer/openclaw.pkr.hcl` — Packer template for Hetzner snapshot (Ubuntu 24.04 + Node.js + OpenClaw + sidecar)
- [ ] T015 [P] Create `infra/cloud-init/user-data.yaml` — bootstrap script that configures sidecar token, starts services
- [ ] T016 [P] Create API route `POST /api/webhooks/stripe` — handle subscription events (created, updated, deleted, trial_ending)
- [ ] T017 Set up portal layout: authenticated shell with sidebar nav (Dashboard, Integrations, Billing, Settings)

**Checkpoint**: Core infrastructure ready — user story work can begin

---

## Phase 3: User Story 1 — Sign Up & Get Running Bot (P1) 🎯 MVP

**Goal**: Non-technical user goes from landing page → working Telegram bot in <5 min

**Independent Test**: Sign up → follow Telegram wizard → send message → get reply

- [ ] T018 Build onboarding wizard UI (multi-step form):
  - Step 1: "Name your assistant" (name, personality picker)
  - Step 2: "Connect Telegram" (BotFather instructions with screenshots, token input, validation)
  - Step 3: "Launching..." (progress indicator while VM provisions)
  - Step 4: "You're live!" (confirmation + deep link to Telegram bot)
- [ ] T019 Create API route `POST /api/provisioning/create` — orchestrates:
  1. Create Stripe trial subscription
  2. Call Hetzner API to create server from snapshot
  3. Wait for cloud-init (poll sidecar /health)
  4. Push Telegram bot token via sidecar /config
  5. Update instance status in Supabase
  6. Return success/failure
- [ ] T020 Create API route `POST /api/integrations/telegram/validate` — validates bot token via Telegram Bot API (getMe)
- [ ] T021 Build provisioning progress component with real-time status updates (polling or SSE)
- [ ] T022 Add error handling: retry button on provisioning failure, clear error messages, support link
- [ ] T023 E2E test: full onboarding flow with mocked Hetzner + Telegram APIs

**Checkpoint**: Core product works — user can sign up and get a bot

---

## Phase 4: User Story 2 — Connect Additional Services (P2)

**Goal**: Add Gmail and Google Calendar from the dashboard

- [ ] T024 Create Google OAuth flow:
  - API route `GET /api/integrations/google/auth` — generates OAuth URL with Gmail + Calendar scopes
  - API route `GET /api/integrations/google/callback` — exchanges code, encrypts tokens, stores in Supabase, pushes to sidecar
- [ ] T025 Build Integrations page UI: card grid showing available integrations with connect/disconnect buttons and status badges
- [ ] T026 Create API route `POST /api/integrations/{type}/disconnect` — removes tokens from Supabase + sidecar
- [ ] T027 Add token refresh logic: background job that refreshes expiring OAuth tokens and updates sidecar

**Checkpoint**: Bot can access email and calendar

---

## Phase 5: User Story 3 — Dashboard & Instance Management (P2)

**Goal**: Users can see and control their instance

- [ ] T028 Build dashboard page:
  - Instance status card (running/stopped/provisioning with live indicator)
  - Connected services list with per-service health status
  - Quick actions: Restart, View Logs
  - Uptime and last activity timestamp
- [ ] T029 Create API route `POST /api/instances/restart` — calls sidecar /restart, updates status
- [ ] T030 Create API route `GET /api/instances/status` — returns instance + integration health from Supabase + live sidecar ping
- [ ] T031 Create API route `GET /api/instances/logs` — proxies sidecar /logs to portal
- [ ] T032 Build health check cron (Vercel Cron or external): polls each instance sidecar every 60s, updates Supabase, triggers auto-restart on failure, sends Telegram alert after 5 min downtime

**Checkpoint**: Users have visibility and control

---

## Phase 6: User Story 4 — Billing (P3)

- [ ] T033 Build pricing page with plan comparison table (Free Trial / Starter / Pro)
- [ ] T034 Build billing dashboard: current plan, usage, next invoice, upgrade/downgrade/cancel buttons
- [ ] T035 Create API route `POST /api/billing/checkout` — creates Stripe Checkout session
- [ ] T036 Create API route `POST /api/billing/portal` — creates Stripe Billing Portal session
- [ ] T037 Implement trial expiry logic: pause instance when trial ends, show upgrade banner, preserve data 30 days
- [ ] T038 Add plan-based feature gating middleware

**Checkpoint**: Revenue-ready

---

## Phase 7: Marketing Landing Page

**Goal**: Launch page that converts visitors to signups

- [ ] T039 Build hero section: headline, subheadline, CTA button, hero image/animation
- [ ] T040 Build "How it works" section: 3-step visual (Sign up → Connect → Chat)
- [ ] T041 Build features section: cards for each integration/capability
- [ ] T042 Build pricing section: plan cards matching Stripe products
- [ ] T043 Build footer: links, legal, social
- [ ] T044 Add SEO meta tags, Open Graph images, favicon
- [ ] T045 [P] Set up custom domain on Vercel
- [ ] T046 [P] Add analytics (Plausible or Vercel Analytics)

**Checkpoint**: Ready to share publicly

---

## Phase 8: Polish & Cross-Cutting

- [ ] T047 [P] Write README.md for the repo (setup, architecture, contributing)
- [ ] T048 [P] Add rate limiting to all API routes
- [ ] T049 [P] Security audit: ensure sidecar tokens are unique per instance, HTTPS only, no secrets in logs
- [ ] T050 [P] Responsive design pass on all portal pages
- [ ] T051 [P] Error boundary components for graceful UI failures
- [ ] T052 Configure GitHub Actions: lint + type check + test on PR

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (Sign Up + Bot)**: Depends on Phase 2 — this is the MVP
- **Phase 4 (Integrations)**: Depends on Phase 2 — can parallel with Phase 3
- **Phase 5 (Dashboard)**: Depends on Phase 2 — can parallel with Phase 3
- **Phase 6 (Billing)**: Depends on Phase 2 — can parallel with Phase 3
- **Phase 7 (Landing Page)**: No backend deps — can start in Phase 1
- **Phase 8 (Polish)**: After Phases 3-6

## Implementation Strategy

### MVP First (recommended)
1. Phase 1 + Phase 7 in parallel (setup + landing page)
2. Phase 2 (foundational)
3. Phase 3 (core product — sign up & bot)
4. Deploy MVP, start collecting signups
5. Phase 4 + 5 + 6 incrementally
6. Phase 8 polish
