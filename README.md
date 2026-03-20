# OpenClaw as a Service (OCaaS)

**Your personal AI assistant, set up in minutes. No coding required.**

OCaaS is a managed hosting platform for [OpenClaw](https://github.com/openclaw/openclaw) — the open-source personal AI assistant. We handle the servers, configuration, and infrastructure so you can focus on what matters: having an AI assistant that actually helps.

## How It Works

1. **Sign up** — Create an account in seconds
2. **Connect** — Link your Telegram, Gmail, Calendar via guided wizards
3. **Chat** — Your AI assistant is live. Message it anytime.

## What You Get

- 🤖 **Personal AI assistant** on Telegram (more platforms coming)
- 📧 **Email management** — inbox summaries, drafts, replies
- 📅 **Calendar integration** — scheduling, reminders, daily briefs
- 🔒 **Your own server** — isolated, private, backed up daily
- 🎛️ **Dashboard** — manage everything from a simple web portal
- 🆘 **Managed support** — we can take over if you need help

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Portal | Next.js 14, Tailwind CSS, Vercel |
| Auth | Clerk |
| Database | Supabase (PostgreSQL) |
| VM Hosting | Hetzner Cloud |
| Billing | Stripe |
| Instance Config | Sidecar API (no SSH) |

## Project Structure

```
apps/
├── web/           # Next.js portal + marketing site
├── sidecar/       # Lightweight API on each user VM
packages/
├── shared/        # Shared types
infra/
├── packer/        # VM image builds
├── cloud-init/    # Instance bootstrap
specs/
├── mvp/           # Spec-kit specification documents
```

## Development

```bash
# Install dependencies
cd apps/web && npm install

# Run locally
npm run dev

# Deploy
git push  # Auto-deploys to Vercel
```

## Spec-Driven Development

This project uses [GitHub Spec Kit](https://github.com/github/spec-kit). See `specs/mvp/` for the full specification:

- [Constitution](.specify/memory/constitution.md) — Project principles
- [Specification](specs/mvp/spec.md) — User stories and requirements
- [Plan](specs/mvp/plan.md) — Implementation plan and architecture
- [Tasks](specs/mvp/tasks.md) — Task breakdown

## License

MIT
