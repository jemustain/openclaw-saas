# Feature Specification: OpenClaw as a Service — MVP

**Feature Branch**: `001-ocaas-mvp`
**Created**: 2026-03-19
**Status**: Draft
**Input**: Managed OpenClaw hosting platform with zero-CLI onboarding

## User Scenarios & Testing

### User Story 1 — Sign Up and Get a Running Bot (Priority: P1)

A non-technical user visits the marketing site, signs up, connects Telegram,
and within 5 minutes has a working AI assistant they can message.

**Why this priority**: This IS the product. If this doesn't work seamlessly,
nothing else matters.

**Independent Test**: Create account → connect Telegram bot → send a message →
get a reply. Entire flow under 5 minutes with no technical knowledge.

**Acceptance Scenarios**:

1. **Given** a new visitor on the landing page, **When** they click "Get Started"
   and sign up with Google, **Then** they land on the onboarding wizard.
2. **Given** a user on the onboarding wizard, **When** they follow the Telegram
   bot setup guide and paste their bot token, **Then** the portal validates the
   token, provisions a VM, deploys OpenClaw, and shows "Your bot is live!"
3. **Given** a live bot, **When** the user sends "Hello" on Telegram, **Then**
   they receive a response from their OpenClaw instance within 30 seconds.
4. **Given** provisioning fails, **When** the VM cannot be created, **Then** the
   user sees a clear error with a "Retry" button and support contact.

---

### User Story 2 — Connect Additional Services (Priority: P2)

A user with a running bot wants to connect Gmail and Google Calendar so their
assistant can check email and manage events.

**Why this priority**: Integrations are the value multiplier — a bot that just
chats is nice, but one that manages your life is worth paying for.

**Independent Test**: From dashboard, connect Gmail via OAuth → assistant can
summarize inbox when asked on Telegram.

**Acceptance Scenarios**:

1. **Given** a running instance, **When** the user clicks "Connect Gmail" and
   completes OAuth, **Then** the portal pushes Gmail credentials to the instance
   and the assistant confirms "Gmail connected!" on Telegram.
2. **Given** a running instance, **When** the user clicks "Connect Google Calendar"
   and completes OAuth, **Then** calendar access is live and the assistant can
   list upcoming events.
3. **Given** an OAuth token expires, **When** the refresh fails, **Then** the
   portal notifies the user to re-authorize via dashboard.

---

### User Story 3 — Dashboard & Instance Management (Priority: P2)

A user wants to see their instance status, connected services, and manage
basic settings from the portal.

**Why this priority**: Users need visibility and control. Without a dashboard,
support tickets spike.

**Independent Test**: Log in → see instance status (running/stopped) → see
connected services → restart instance → see it come back online.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they visit the dashboard, **Then** they
   see instance status (running/stopped/provisioning), uptime, and connected
   services with status indicators.
2. **Given** a running instance, **When** the user clicks "Restart", **Then**
   the instance restarts within 60 seconds and status updates in real-time.
3. **Given** a connected service showing "Error", **When** the user clicks
   "Reconnect", **Then** they're guided through re-authorization.

---

### User Story 4 — Billing & Subscription (Priority: P3)

A user signs up for a paid plan after trial, manages their subscription,
and can cancel anytime.

**Why this priority**: Revenue enablement, but not blocking the core experience.

**Independent Test**: Sign up for free trial → upgrade to paid → see invoice →
downgrade → cancel. All via portal.

**Acceptance Scenarios**:

1. **Given** a new user, **When** they sign up, **Then** they get a 7-day free
   trial with full features.
2. **Given** a trial user, **When** trial expires, **Then** instance pauses and
   user sees upgrade prompt. Instance data preserved for 30 days.
3. **Given** a paying user, **When** they visit billing, **Then** they see
   current plan, next invoice, and can upgrade/downgrade/cancel.

---

### User Story 5 — Managed Takeover (Priority: P3)

A user hits an issue they can't resolve via the portal and requests managed
support where the team takes over their instance.

**Why this priority**: Premium differentiator and safety net, but not MVP-critical.

**Independent Test**: User clicks "Request Support" → support team gets access →
resolves issue → user gets notified.

**Acceptance Scenarios**:

1. **Given** a user on a managed plan, **When** they click "Request Help",
   **Then** a support ticket is created and the team can access the instance
   via secure tunnel.
2. **Given** active managed support, **When** the issue is resolved, **Then**
   the user is notified and support access is revoked.

---

### Edge Cases

- What happens when Hetzner API is down during provisioning? → Queue and retry with exponential backoff, notify user of delay.
- What happens when a user's OpenClaw instance runs out of disk? → Auto-alert at 80%, auto-expand or notify at 95%.
- What happens when a user deletes their Telegram bot externally? → Health check detects disconnect, notifies user via email, shows "Disconnected" on dashboard.
- What happens during OpenClaw version upgrades? → Rolling updates during low-activity window, rollback on health check failure.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provision an isolated VM with OpenClaw pre-installed within 3 minutes of onboarding completion.
- **FR-002**: System MUST support Telegram as the initial messaging platform with guided BotFather setup.
- **FR-003**: System MUST support Gmail and Google Calendar OAuth connections from the portal.
- **FR-004**: System MUST provide a real-time dashboard showing instance status and connected services.
- **FR-005**: System MUST handle billing via Stripe with free trial, monthly subscriptions, and self-service cancellation.
- **FR-006**: System MUST perform health checks every 60 seconds and auto-restart failed instances.
- **FR-007**: System MUST create daily backups with 7-day retention.
- **FR-008**: Portal MUST push configuration changes to instances via a sidecar API (no SSH).
- **FR-009**: System MUST support instance pause/resume for billing state changes.
- **FR-010**: Marketing landing page MUST clearly communicate value prop, pricing, and include signup CTA.

### Key Entities

- **User**: Portal account (via Clerk), linked to one Instance, has Subscription
- **Instance**: Hetzner VM metadata (IP, region, status, OpenClaw version), linked to Integrations
- **Integration**: Connected service (type, OAuth tokens, status, last health check)
- **Subscription**: Stripe subscription ID, plan tier, trial status, billing dates

## Success Criteria

### Measurable Outcomes

- **SC-001**: A non-technical user can go from landing page to working Telegram bot in under 5 minutes.
- **SC-002**: Instance provisioning succeeds on first attempt ≥95% of the time.
- **SC-003**: Instance uptime ≥99.5% measured monthly.
- **SC-004**: Portal pages load in under 2 seconds (p95).
- **SC-005**: Users can connect Gmail/Calendar without contacting support ≥90% of the time.
