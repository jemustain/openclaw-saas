ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_provider text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_api_key text;
