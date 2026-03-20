# Claw4All — Task Breakdown

## Phase 1: Foundation (Week 1)
- [x] T01: Initialize repo + monorepo structure
- [x] T02: Set up Next.js 15 + Tailwind on Vercel
- [x] T03: Create landing page
- [x] T04: Write constitution, spec, plan
- [ ] T05: Set up Supabase project (auth + database)
- [ ] T06: Set up Clerk or Supabase Auth (email + GitHub login)
- [ ] T07: Create database schema (users, servers, skills, subscriptions)
- [ ] T08: Set up Stripe account + products (Free, Basic $10, Pro $25)

## Phase 2: Provider Integrations (Week 2)
- [ ] T09: Hetzner API client (create server, list servers, delete server, SSH keys)
- [ ] T10: DigitalOcean API client (same operations)
- [ ] T11: Vultr API client (same operations)
- [ ] T12: Provider abstraction layer (common interface for all providers)
- [ ] T13: Cloud-init template for OpenClaw installation
- [ ] T14: Cloud-init template for sidecar agent installation
- [ ] T15: Test provisioning on Hetzner (manual API key)
- [ ] T16: Test provisioning on DigitalOcean
- [ ] T17: Set up referral/affiliate links for all providers

## Phase 3: Setup Wizard (Week 3)
- [ ] T18: Wizard UI — Step 1: Choose provider (with referral links)
- [ ] T19: Wizard UI — Step 2: Guide to create account + API key
- [ ] T20: Wizard UI — Step 3: Paste API key + choose region
- [ ] T21: Wizard UI — Step 4: Real-time provisioning progress
- [ ] T22: Wizard UI — Step 5: Messaging platform connection (WhatsApp/Telegram/Signal)
- [ ] T23: Wizard UI — Step 6: "Your agent is ready!" with credentials
- [ ] T24: Serverless provisioning endpoint (Vercel API route)
- [ ] T25: API key validation per provider before provisioning
- [ ] T26: Error handling + retry logic for failed provisioning
- [ ] T27: Ephemeral SSH key management (create, use, delete)

## Phase 4: Sidecar Agent (Week 3-4)
- [ ] T28: Sidecar agent scaffold (Node.js + Express/Fastify)
- [ ] T29: Health endpoint (CPU, RAM, disk, uptime)
- [ ] T30: OpenClaw status endpoint
- [ ] T31: OpenClaw restart endpoint
- [ ] T32: OpenClaw update endpoint
- [ ] T33: Skill install endpoint
- [ ] T34: Skill list endpoint
- [ ] T35: Bearer token auth middleware
- [ ] T36: HTTPS setup (self-signed cert or Let's Encrypt)
- [ ] T37: Heartbeat to Claw4All portal (server online/offline tracking)

## Phase 5: User Dashboard (Week 4)
- [ ] T38: Dashboard layout + navigation
- [ ] T39: Server status card (online/offline, uptime, resources)
- [ ] T40: One-click restart button
- [ ] T41: One-click update button
- [ ] T42: Server credentials display (with copy buttons)
- [ ] T43: Connected messaging platforms display
- [ ] T44: "My Skills" section

## Phase 6: Skill Marketplace (Week 5)
- [ ] T45: Marketplace page layout with categories
- [ ] T46: Skill card component (name, description, rating, install count)
- [ ] T47: Skill detail page
- [ ] T48: One-click install flow (calls sidecar API)
- [ ] T49: Seed marketplace with 10-15 curated free skills
- [ ] T50: Premium skill flag + paywall integration

## Phase 7: Payments & Premium (Week 5-6)
- [ ] T51: Stripe checkout integration
- [ ] T52: Subscription management (upgrade/downgrade/cancel)
- [ ] T53: Premium feature gating middleware
- [ ] T54: Support ticket form (Basic tier)
- [ ] T55: Calendar booking integration for Pro tier (Cal.com or Calendly)

## Phase 8: Launch Prep (Week 6)
- [ ] T56: Landing page polish (testimonials, FAQ, comparison table)
- [ ] T57: SEO optimization (meta tags, OpenGraph, sitemap)
- [ ] T58: Write 3 tutorial blog posts (one per provider)
- [ ] T59: Record setup walkthrough video
- [ ] T60: Set up community Discord or forum
- [ ] T61: Beta testing with 5-10 users
- [ ] T62: Fix bugs from beta
- [ ] T63: Launch on Product Hunt, Hacker News, Reddit r/selfhosted
- [ ] T64: Announce on OpenClaw Discord community

---

**Total: 64 tasks across 8 phases (~6 weeks to MVP)**

**Critical path:** Phase 2 (provider APIs) → Phase 3 (wizard) → Phase 4 (sidecar) — these are sequential and blocking.

**Quick wins:** Phase 1 is mostly done. Landing page is live at claw4all-app.vercel.app.
