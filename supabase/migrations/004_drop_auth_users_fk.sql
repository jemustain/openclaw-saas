-- 004_drop_auth_users_fk.sql
-- The app uses custom Google OAuth (not Supabase Auth), so users.id
-- should not reference auth.users. Drop the FK constraint.

-- Also add missing columns used by the Google callback
alter table public.users
  add column if not exists google_id text,
  add column if not exists avatar_url text;

-- Drop the FK to auth.users
alter table public.users
  drop constraint if exists users_id_fkey,
  drop constraint if exists users_pkey;

alter table public.users
  alter column id set default gen_random_uuid(),
  add primary key (id);

-- Create unique index on google_id for upserts
create unique index if not exists idx_users_google_id on public.users (google_id) where google_id is not null;
create unique index if not exists idx_users_email on public.users (email);
