# Free Tier Scheduler

Cron endpoint that manages free-tier VM uptime.

## How it works

- Runs every 15 minutes via Vercel Cron (`GET /api/cron/scheduler`)
- Queries all free-tier assistants with `active` or `suspended` status
- For each assistant, checks if the current time falls within their **8-hour active window** (default: 8 AM – 4 PM in the user's timezone)
- **Outside window + active** → suspends the VM
- **Within window + suspended** → resumes the VM
- Paid tiers are excluded — they run 24/7

## Configuration

Set `CRON_SECRET` in your environment variables. The endpoint requires it as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your-cron-secret>
```

Vercel Cron automatically sends this header when `CRON_SECRET` is set in the project's environment variables.

## Tier behavior

| Tier    | Daily uptime | Scheduling |
|---------|-------------|------------|
| Free    | 8h/day      | 8am–4pm user timezone |
| Starter | 24/7        | Always on |
| Pro     | 24/7        | Always on |
