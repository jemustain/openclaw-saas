# ShiftWorker — MVP Specification

_Managed AI assistants you talk to via chat. We handle everything._

## Vision

ShiftWorker gives everyone a personal AI assistant that lives in their favorite chat app. Users click a button, connect WhatsApp or Telegram, and start talking. We provision and manage the infrastructure invisibly — the user never sees a server, terminal, or config file.

Think "Superhuman for AI assistants." Simple signup, instant value, zero technical knowledge required.

---

## User Stories

### US-01: One-Click Launch
**As a** new user,
**I want to** click "Launch my assistant" and have it ready within 60 seconds,
**So that** I can start using my AI assistant immediately without any technical setup.

**Acceptance Criteria:**
- User signs up with email or Google
- Clicks "Launch my assistant"
- We provision an OpenClaw VM on our DigitalOcean account via API (invisible to user)
- User sees a friendly progress indicator ("Setting things up…" → "Almost ready…" → "Done!")
- Total time: < 90 seconds
- User is prompted to connect a messaging app

### US-02: Messaging Connection
**As a** user with a launched assistant,
**I want to** connect WhatsApp, Telegram, or another chat app,
**So that** I can talk to my assistant from my phone like texting a friend.

**Acceptance Criteria:**
- WhatsApp: scan QR code
- Telegram: guided BotFather flow or QR link
- Signal: linked device flow
- Discord/Slack: bot invite link
- At least one messaging platform connected before onboarding completes
- Test message exchange confirmed working

### US-03: Chat with My Assistant
**As a** connected user,
**I want to** text my assistant and have it do things for me,
**So that** I get real value from day one.

**Acceptance Criteria:**
- Assistant responds within seconds
- Can handle: email summary, calendar check, web research, reminders, general Q&A
- Personality is warm and helpful (powered by OpenClaw's SOUL.md)
- Works 24/7 on paid plan, limited hours on free plan

### US-04: Usage Dashboard
**As a** user,
**I want to** see how I'm using my assistant and manage my account,
**So that** I understand my usage and can upgrade if I want more.

**Acceptance Criteria:**
- Dashboard shows: assistant status (online/offline), messages today, uptime
- Usage meter for free tier (hours used / hours remaining)
- One-click upgrade to paid plan
- Connected messaging platforms with reconnect option
- No technical details exposed (no CPU, RAM, server info)

### US-05: Skill Library
**As a** user,
**I want to** browse and enable capabilities for my assistant,
**So that** I can customize what it can do.

**Acceptance Criteria:**
- Library of toggleable skills (email, calendar, web browsing, smart home, etc.)
- One-click enable/disable
- Premium skills gated behind paid tier
- Skills described in plain language ("Manages your email" not "IMAP/SMTP integration")

---

## Revenue Model

### Free Tier
- Assistant runs 8 hours/day (e.g., 9am–5pm user's timezone)
- 100 messages/day limit
- Basic skills (chat, reminders, web search)
- Single messaging platform

### Starter ($12/mo)
- 24/7 assistant
- Unlimited messages
- All standard skills (email, calendar, web browsing)
- Multiple messaging platforms
- Priority response times

### Pro ($25/mo)
- Everything in Starter
- Premium skills (smart home, social media management, custom workflows)
- Priority support (4h response)
- Custom personality & behavior tuning
- API access for power users

### Unit Economics (per user)
- DigitalOcean Droplet (Basic): ~$6/mo
- AI API usage (Anthropic/OpenAI): ~$3-8/mo avg
- Our margin at $12/mo Starter: ~$0-4/mo (break-even to slight margin)
- Our margin at $25/mo Pro: ~$12-17/mo (healthy margin)
- Free tier cost: $5/mo subsidized (offset by conversion to paid)

### Revenue Targets
- 100 paid users = ~$1,500/mo revenue, ~$700/mo margin
- 1,000 paid users = ~$15,000/mo revenue, ~$7,000/mo margin
- Free tier converts at ~10-20% assumed

---

## Out of Scope for MVP
- Mobile app (web dashboard + chat apps only)
- Multi-agent setups
- Enterprise / team features
- Custom LLM / local model support
- Self-hosting option (future: open-source the setup for power users)
