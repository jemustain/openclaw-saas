# ShiftWorker — Task Breakdown

## Phase 1: Foundation (Week 1)
- [x] T01: Initialize repo + monorepo structure
- [x] T02: Set up Next.js 15 + Tailwind on Vercel
- [x] T03: Create landing page
- [x] T04: Write spec, plan, tasks
- [ ] T05: Set up Supabase project (auth + database)
- [ ] T06: Set up Supabase Auth (email + Google login)
- [ ] T07: Database schema: users, assistants (vm_id, status, plan, created_at), subscriptions, usage_logs
- [ ] T08: Set up Stripe products: Free, Starter ($12/mo), Pro ($25/mo)
- [x] T09: Rewrite landing page for managed model (no tech jargon)

## Phase 2: VM Orchestration (Week 2)
- [ ] T10: DigitalOcean API client — create VM with cloud-init
- [ ] T11: DigitalOcean API client — destroy VM, list VMs, get status
- [ ] T12: Cloud-init template: install OpenClaw + sidecar agent
- [ ] T13: Sidecar agent scaffold (Node.js, phones home on startup)
- [ ] T14: Sidecar health endpoint + heartbeat to portal
- [ ] T15: VM lifecycle state machine (provisioning → active → suspended → destroying)
- [ ] T16: Serverless endpoint: POST /api/launch — provisions VM, records in DB
- [ ] T17: Serverless endpoint: POST /api/suspend — stops VM (free tier off-hours)
- [ ] T18: Serverless endpoint: POST /api/destroy — tears down VM
- [ ] T19: Test full provisioning flow end-to-end on DigitalOcean
- [ ] T20: Free tier scheduler — start/stop VMs based on user timezone + 8h window

## Phase 3: Onboarding Flow (Week 3)
- [ ] T21: Post-signup onboarding page — "Launch my assistant" button
- [ ] T22: Real-time provisioning UI (progress indicator while VM spins up)
- [ ] T23: Messaging connection — WhatsApp QR code flow
- [ ] T24: Messaging connection — Telegram bot setup flow
- [ ] T25: Messaging connection — Signal/Discord/Slack options
- [ ] T26: "Your assistant is ready! Say hi." confirmation screen
- [ ] T27: Sidecar endpoint: POST /messaging/setup — configure bridge on VM

## Phase 4: User Dashboard (Week 4)
- [ ] T28: Dashboard layout — clean, non-technical
- [ ] T29: Assistant status card (online/offline + uptime)
- [ ] T30: Usage display (messages today, hours active)
- [ ] T31: Connected platforms display + reconnect buttons
- [ ] T32: Plan & billing section (current plan, upgrade CTA, manage subscription)
- [ ] T33: Skill library — browse and toggle skills
- [ ] T34: Skill detail view with plain-language descriptions

## Phase 5: Billing (Week 4-5)
- [ ] T35: Stripe Checkout integration (subscribe to Starter/Pro)
- [ ] T36: Stripe webhook handler (subscription created/updated/cancelled/payment_failed)
- [ ] T37: Plan enforcement — free tier limits (8h/day, 100 msg/day, 1 platform)
- [ ] T38: Upgrade flow — user upgrades → VM switches to 24/7
- [ ] T39: Cancellation flow — grace period → suspend → destroy after 30 days
- [ ] T40: Billing portal link (Stripe Customer Portal for invoices/payment method)

## Phase 6: Sidecar Agent (Week 5)
- [ ] T41: Sidecar: OpenClaw restart endpoint
- [ ] T42: Sidecar: OpenClaw update endpoint
- [ ] T43: Sidecar: skill install/remove endpoints
- [ ] T44: Sidecar: messaging bridge configuration
- [ ] T45: Sidecar: usage metering (message count, API token usage)
- [ ] T46: Sidecar: report usage to portal via heartbeat
- [ ] T47: Sidecar: auth (mTLS or shared secret)

## Phase 7: Polish & Launch (Week 6)
- [ ] T48: Landing page polish (testimonials placeholder, FAQ, social proof)
- [ ] T49: SEO (meta tags, OpenGraph, sitemap)
- [ ] T50: Error handling + graceful degradation across all flows
- [ ] T51: Email notifications (welcome, assistant ready, payment failed, etc.)
- [ ] T52: Beta test with 10 users
- [ ] T53: Fix bugs from beta
- [ ] T54: Launch — Product Hunt, HN, Reddit, OpenClaw community

---

**Total: 54 tasks across 7 phases (~6 weeks to MVP)**

**Critical path:** Phase 2 (VM orchestration) → Phase 3 (onboarding) → Phase 5 (billing)

**Quick wins done:** Landing page, repo structure, specs. Next: Supabase + DigitalOcean API client.
