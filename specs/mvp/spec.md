# Claw4All — MVP Specification

_Free OpenClaw Setup Wizard + Skill Marketplace_

## Vision
Make OpenClaw accessible to everyone by automating the entire setup process. Users bring their own VPS, we handle the rest. Free to start, premium to enhance.

---

## User Stories

### US-01: Provider-Guided Onboarding
**As a** non-technical user,
**I want to** follow a step-by-step wizard that helps me create a VPS account and get OpenClaw running,
**So that** I can have my own AI assistant without touching a terminal.

**Acceptance Criteria:**
- Wizard walks through: pick provider → create account (via referral link) → generate API key → paste it in → we do the rest
- Supported providers: Hetzner (primary), DigitalOcean, Vultr
- User sees real-time progress ("Creating server… Installing OpenClaw… Connecting messaging…")
- Total time from start to working agent: < 15 minutes
- User receives credentials and a "your agent is ready" confirmation

### US-02: Messaging Connection
**As a** user who just set up their server,
**I want to** connect my AI assistant to WhatsApp, Telegram, or Signal,
**So that** I can talk to my agent from my phone.

**Acceptance Criteria:**
- Wizard presents QR code or bot token flow for each platform
- WhatsApp: QR code scan (via OpenClaw's WhatsApp bridge)
- Telegram: guided BotFather setup + token entry
- Signal: linked device flow
- At least one messaging platform connected before wizard completes
- Test message sent and confirmed working

### US-03: Skill Marketplace Browse & Install
**As a** user with a running OpenClaw instance,
**I want to** browse and one-click install skills from a marketplace,
**So that** I can extend my agent's capabilities without coding.

**Acceptance Criteria:**
- Marketplace page with categories (productivity, smart home, social, finance)
- Each skill has: description, rating, install count, "Install" button
- Free skills available to all users
- Premium skills require Claw4All account upgrade
- Installation happens via API call to user's sidecar agent
- Installed skills visible in "My Skills" dashboard

### US-04: Server Health Dashboard
**As a** user who owns their VPS,
**I want to** see my server's status, uptime, and resource usage,
**So that** I know my agent is running and healthy.

**Acceptance Criteria:**
- Dashboard shows: server status (online/offline), uptime, CPU/RAM usage
- Alert if server goes down or OpenClaw crashes
- One-click restart button
- Shows current OpenClaw version + available updates
- "Update OpenClaw" button that runs the update remotely

### US-05: Premium Support & Custom Setup
**As a** user who wants help beyond the basics,
**I want to** purchase premium support or custom configuration,
**So that** I can get expert help with advanced setups.

**Acceptance Criteria:**
- Support tiers: Free (community forum), Basic ($10/mo — email support), Pro ($25/mo — priority + custom skills)
- Custom setup requests via form (e.g., "connect to my smart home", "set up voice assistant")
- Stripe checkout for paid tiers
- Support ticket system or calendar booking for Pro tier

---

## Revenue Model

### Free (always)
- Setup wizard for any supported provider
- Basic skill marketplace
- Community forum access
- Server health dashboard

### Referral Revenue (passive)
- Hetzner: partner/affiliate commission on signups
- DigitalOcean: $200 credit referral program
- Vultr: 10% recurring commission
- Estimated: $0.50-1.50/mo per active user (recurring)

### Premium ($10-25/mo)
- Premium skill packs (curated, tested, maintained)
- Priority email/chat support
- Custom integrations & setup
- Advanced monitoring & alerts
- Automatic updates & backup management

### Marketplace Revenue (future)
- Skill creators list premium skills
- Claw4All takes 20-30% commission
- Creates ecosystem flywheel

---

## Out of Scope for MVP
- Hosting user servers ourselves (we NEVER do this)
- Local LLM support (users bring their own API keys)
- Mobile app (web-only for now)
- Multi-agent setups
- Enterprise features
