-- Migration: Add telegram_bot_username and telegram_bot_token to users table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bbraehnpnupxjeddssyq/sql/new

ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_bot_username text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_bot_token text;

-- Note: Bot tokens should be set via the application, not in migration files.
-- Never commit bot tokens or API keys to source control.
