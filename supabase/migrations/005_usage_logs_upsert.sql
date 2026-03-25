-- Add unique constraint on (assistant_id, date) to support upsert in usage recording
ALTER TABLE public.usage_logs
  ADD CONSTRAINT usage_logs_assistant_date_unique UNIQUE (assistant_id, date);

-- Add sidecar_token column to assistants for per-instance auth
ALTER TABLE public.assistants
  ADD COLUMN IF NOT EXISTS sidecar_token text;
