-- Migration: Add telegram_bot_username and telegram_bot_token to users table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bbraehnpnupxjeddssyq/sql/new

ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_bot_username text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_bot_token text;

-- Save Julie's existing bot
UPDATE users
SET telegram_bot_username = 'sw_25c935d0_bot',
    telegram_bot_token = '8750667722:AAF5Y0mN_rHjNhkF-wnu4p3k8GAypqD0b_k'
WHERE id = '25c935d0-a7a3-422d-929e-b4dbb9dc4856';
