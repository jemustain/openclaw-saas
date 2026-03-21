-- Provider OAuth tokens (DigitalOcean, Azure, etc.)
CREATE TABLE provider_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE provider_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own tokens"
  ON provider_tokens FOR ALL
  USING (auth.uid() = user_id);
