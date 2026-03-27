-- Add azure_subscription_id column to users table
-- Stores the user's chosen Azure subscription for VM provisioning
ALTER TABLE users ADD COLUMN IF NOT EXISTS azure_subscription_id TEXT;
