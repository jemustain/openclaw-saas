-- Add messaging columns to assistants table
ALTER TABLE public.assistants ADD COLUMN IF NOT EXISTS telegram_bot_username text;
ALTER TABLE public.assistants ADD COLUMN IF NOT EXISTS telegram_bot_token text;
ALTER TABLE public.assistants ADD COLUMN IF NOT EXISTS whatsapp_connected boolean DEFAULT false;
ALTER TABLE public.assistants ADD COLUMN IF NOT EXISTS discord_bot_token text;
ALTER TABLE public.assistants ADD COLUMN IF NOT EXISTS slack_bot_token text;
