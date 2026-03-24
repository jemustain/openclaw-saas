-- Add columns needed by the VM scheduler cron endpoint

-- Users: window_start (0-23 hour in user's timezone) and onboarding_complete flag
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS window_start integer,
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Note: assistants table already has vm_id; the scheduler route should use vm_id
-- instead of the non-existent droplet_id column.
