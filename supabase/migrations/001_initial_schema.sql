-- 001_initial_schema.sql
-- OpenClaw SaaS — initial database schema

-- Enums
create type public.plan as enum ('free', 'starter', 'pro');
create type public.assistant_status as enum ('provisioning', 'active', 'suspended', 'destroying', 'destroyed');
create type public.subscription_status as enum ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');

-- Users
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text,
  plan public.plan not null default 'free',
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Assistants
create table public.assistants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  vm_id text,
  provider text not null default 'digitalocean',
  region text,
  status public.assistant_status not null default 'provisioning',
  ip_address text,
  sidecar_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan public.plan not null default 'free',
  status public.subscription_status not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Usage logs
create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null references public.assistants on delete cascade,
  date date not null default current_date,
  messages_sent integer not null default 0,
  hours_active numeric not null default 0,
  api_tokens_used integer not null default 0
);

-- Indexes
create index idx_assistants_user_id on public.assistants (user_id);
create index idx_subscriptions_user_id on public.subscriptions (user_id);
create index idx_usage_logs_assistant_id on public.usage_logs (assistant_id);
create index idx_usage_logs_date on public.usage_logs (date);

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger trg_assistants_updated_at before update on public.assistants
  for each row execute function public.set_updated_at();
create trigger trg_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.users enable row level security;
alter table public.assistants enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_logs enable row level security;

-- Users: read/update own row
create policy "Users can read own row" on public.users
  for select using (auth.uid() = id);
create policy "Users can update own row" on public.users
  for update using (auth.uid() = id);

-- Assistants: CRUD own rows
create policy "Users can read own assistants" on public.assistants
  for select using (auth.uid() = user_id);
create policy "Users can insert own assistants" on public.assistants
  for insert with check (auth.uid() = user_id);
create policy "Users can update own assistants" on public.assistants
  for update using (auth.uid() = user_id);
create policy "Users can delete own assistants" on public.assistants
  for delete using (auth.uid() = user_id);

-- Subscriptions: read own
create policy "Users can read own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Usage logs: read own (via assistant ownership)
create policy "Users can read own usage logs" on public.usage_logs
  for select using (
    auth.uid() = (select user_id from public.assistants where id = assistant_id)
  );
