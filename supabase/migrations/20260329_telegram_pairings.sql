CREATE TABLE IF NOT EXISTS public.telegram_pairings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  assistant_id uuid NOT NULL,
  pairing_token text NOT NULL UNIQUE,
  telegram_chat_id text,
  telegram_username text,
  status text NOT NULL DEFAULT 'pending', -- pending | paired | confirmed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_telegram_pairings_token ON public.telegram_pairings(pairing_token);
CREATE INDEX idx_telegram_pairings_user ON public.telegram_pairings(user_id);
