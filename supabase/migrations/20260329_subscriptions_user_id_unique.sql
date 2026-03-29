-- Add unique constraint on user_id so upsert works correctly.
-- Each user should have at most one subscription record.
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);
