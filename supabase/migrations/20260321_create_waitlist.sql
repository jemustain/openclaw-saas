create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Allow anonymous inserts (the landing page uses the anon key)
alter table public.waitlist enable row level security;

create policy "Anyone can join the waitlist"
  on public.waitlist for insert
  to anon
  with check (true);
