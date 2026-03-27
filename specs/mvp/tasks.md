# ShiftWorker - Task Breakdown

## Current Status (Updated 2026-03-26)

**Primary cloud provider: Microsoft Azure** (pivoted from DigitalOcean/Oracle)
**Auth: Google OAuth** (not Supabase Auth)
**VM provisioning: Async step-based** (works within Vercel 10s timeout)

---

## Phase 1: Foundation
- [x] T01: Initialize repo + monorepo structure
- [x] T02: Set up Next.js 15 + Tailwind on Vercel
- [x] T03: Create landing page
- [x] T04: Write spec, plan, tasks
- [x] T05: Set up Supabase project (database)
- [x] T06: Set up auth (Google OAuth, custom session cookies)
- [x] T07: Database schema: users, assistants, provider_tokens, waitlist, usage_logs
- [x] T08: Set up Stripe products: Free, Pro ($12/mo)
- [x] T09: Rewrite landing page for managed model

## Phase 2: VM Orchestration
- [x] T10: Azure API client - create VM with cloud-init
- [x] T11: Azure API client - destroy VM, list VMs, get status
- [x] T12: Cloud-init template: install OpenClaw + sidecar agent
- [x] T13: Sidecar agent scaffold (phones home on startup)
- [ ] T14: Sidecar health endpoint + heartbeat to portal
- [x] T15: VM lifecycle state machine (provisioning -> active -> suspended -> destroying)
- [x] T16: POST /api/assistant/launch - provisions VM (async step-based)
- [x] T17: POST /api/assistant/suspend - stops VM
- [x] T18: POST /api/assistant/destroy - tears down VM
- [ ] **T19: Test full provisioning flow E2E on Azure** (in progress - image ref fixed, async provisioning deployed)
- [x] T20: Free tier scheduler - cron-based VM scheduling

## Phase 3: Onboarding Flow
- [x] T21: Post-signup onboarding wizard (7-step: welcome, hosting, plan, messengers, skills, setup, ready)
- [x] T22: Provisioning UI (step-based progress via dashboard polling)
- [ ] T23: WhatsApp QR code flow (API endpoint exists, needs live VM to test)
- [ ] T24: Telegram bot setup flow (API endpoint exists, needs live VM)
- [ ] T25: Signal/Discord/Slack options (UI exists in wizard)
- [ ] T26: "Your assistant is ready!" confirmation
- [ ] T27: Sidecar endpoint: POST /messaging/setup

## Phase 4: User Dashboard
- [x] T28: Dashboard layout
- [x] T29: Assistant status card (online/offline/provisioning + destroy button)
- [x] T30: Usage display (messages today, hours active)
- [x] T31: Connected platforms display + set up links
- [x] T32: Plan & billing section (current plan, upgrade CTA)
- [x] T33: Skill library - browse and toggle skills
- [x] T34: Skill detail view

## Phase 5: Billing
- [x] T35: Stripe Checkout integration
- [x] T36: Stripe webhook handler
- [x] T37: Plan enforcement - free tier limits
- [ ] T38: Upgrade flow - user upgrades -> VM switches to 24/7
- [x] T39: Cancellation flow + grace periods
- [x] T40: Billing portal link

## Phase 6: Sidecar Agent
- [ ] T41: Sidecar: OpenClaw restart endpoint
- [ ] T42: Sidecar: OpenClaw update endpoint
- [ ] T43: Sidecar: skill install/remove endpoints
- [ ] T44: Sidecar: messaging bridge configuration
- [ ] T45: Sidecar: usage metering
- [ ] T46: Sidecar: report usage to portal via heartbeat
- [ ] T47: Sidecar: auth (shared secret via sidecar_token)

## Phase 7: Polish & Launch
- [x] T48: Landing page (CTAs to sign-in, newsletter instead of waitlist)
- [x] T49: SEO (meta tags, OpenGraph, sitemap, robots.txt)
- [ ] T50: Error handling + graceful degradation
- [x] T51: Email notifications (waitlist welcome, via Resend)
- [ ] T52: Beta test with 10 users
- [ ] T53: Fix bugs from beta
- [ ] T54: Launch

---

## Azure OAuth (Completed 2026-03-26)

After 7 PRs of iteration, the Azure OAuth flow works:
- Uses tenant-specific endpoint (AZURE_TENANT_ID env var)
- Requests ARM scope directly in authorize URL
- Personal Microsoft accounts work (member of Azure AD tenant)
- Single-step token exchange (no two-step refresh dance)
- See docs/publisher-verification.md for full details

## Async VM Provisioning (Completed 2026-03-26)

VM provisioning is split into 8 discrete steps, each ~2-5s:
```
validate -> create_rg -> create_nsg -> create_vnet -> create_ip -> create_nic -> create_vm -> wait_vm -> done
```

- Launch API returns immediately (creates DB record only)
- Dashboard polling advances one step per poll
- Cron job advances stuck assistants as fallback
- Each step is idempotent (safe to retry on failure)
- Intermediate state stored in provisioning_data JSON column

## Critical Path to Launch

1. **T19: E2E VM provisioning test** - verify a VM actually comes online
2. **T14/T46: Sidecar phone-home** - so portal knows VM is ready
3. **T23/T24: Messaging setup** - users need to connect WhatsApp/Telegram
4. **T52: Beta test** - real users, real feedback
