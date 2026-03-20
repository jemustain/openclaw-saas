<!--
Sync Impact Report:
- Version change: N/A → 1.0.0 (initial ratification)
- Added sections: Core Principles (6), Technology Constraints, Development Workflow, Governance
- Templates requiring updates: N/A (initial creation)
- Follow-up TODOs: None
-->

# OpenClaw as a Service (OCaaS) Constitution

## Core Principles

### I. Zero-CLI User Experience (NON-NEGOTIABLE)

Every user-facing interaction MUST be achievable through a web portal GUI.
Users MUST never need to open a terminal, SSH into a server, or edit config
files. All OpenClaw configuration, account connections, and instance management
MUST be handled through guided UI flows. If a feature cannot be exposed via
the portal, it MUST NOT be advertised to users.

### II. Isolation by Default

Each user MUST receive a dedicated, isolated compute instance. No shared
runtimes, no multi-tenant OpenClaw processes. User data, credentials, and
conversation history MUST never be accessible across tenant boundaries.
Instance-level secrets MUST be encrypted at rest and in transit.

### III. One-Click Integrations

Platform connections (Telegram, WhatsApp, Discord, Gmail, Google Calendar)
MUST use OAuth or guided setup wizards. Where full OAuth is not available
(e.g., Telegram BotFather, WhatsApp QR), the portal MUST provide step-by-step
visual guidance with real-time validation that the connection succeeded.

### IV. Resilience and Self-Healing

Managed instances MUST auto-recover from crashes, OOM events, and transient
failures without user intervention. Health checks MUST run at minimum every
60 seconds. Automated backups MUST occur daily with 7-day retention minimum.
Users MUST be notified of extended downtime (>5 minutes) via their connected
messaging platform.

### V. Transparent Pricing

Costs MUST be predictable and clearly communicated before signup. No hidden
fees for API calls, storage, or bandwidth. Users MUST be able to see current
usage and projected costs at any time from the portal dashboard.

### VI. Graceful Degradation

If a connected service (Gmail, Calendar, etc.) becomes unavailable, the
OpenClaw instance MUST continue operating with remaining services. Partial
outages MUST NOT crash the instance. Users MUST be informed which
integrations are degraded via their primary messaging channel.

## Technology Constraints

- **Portal**: Next.js 14+ with App Router, Tailwind CSS, deployed on Vercel
- **Database**: Supabase (PostgreSQL) for user accounts, instance metadata, billing state
- **VM Provider**: Hetzner Cloud API (primary), Fly.io Machines (US/fallback)
- **Configuration**: API-driven via sidecar agent on each VM — no SSH from portal
- **Payments**: Stripe Checkout + Billing Portal for subscriptions
- **Auth**: Clerk for portal authentication (social login, email/password)
- **Monitoring**: Lightweight health-check service polling each instance
- **IaC**: Packer for VM images, cloud-init for instance bootstrapping

## Development Workflow

- **Branching**: Feature branches off `main`, PRs required for all changes
- **Testing**: Integration tests for provisioning flows, E2E tests for onboarding wizard
- **Deploys**: Portal auto-deploys via Vercel on merge to `main`; VM image builds triggered manually or on release tags
- **Reviews**: All PRs require at least one approval; infrastructure changes require manual verification in staging
- **Environments**: `staging` (single Hetzner instance) and `production`

## Governance

This constitution supersedes ad-hoc decisions. Amendments require:
1. A written proposal describing the change and rationale
2. Review of impact on existing users and infrastructure
3. Version bump following semver (MAJOR for principle removal/redefinition, MINOR for additions, PATCH for clarifications)
4. Update to all dependent spec documents

**Version**: 1.0.0 | **Ratified**: 2026-03-19 | **Last Amended**: 2026-03-19
