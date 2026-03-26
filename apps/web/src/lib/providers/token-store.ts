import crypto from 'crypto';
import { createClient } from '../supabase/server';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is not set');
  return crypto.createHash('sha256').update(key).digest();
}

function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decrypt(data: string): string {
  const key = getKey();
  const [ivHex, tagHex, encrypted] = data.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function saveProviderToken(
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null,
) {
  const supabase: any = await createClient();
  const { error } = await supabase
    .from('provider_tokens')
    .upsert(
      {
        user_id: userId,
        provider,
        access_token_encrypted: encrypt(accessToken),
        refresh_token_encrypted: refreshToken ? encrypt(refreshToken) : null,
        expires_at: expiresAt?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    );
  if (error) throw new Error(`Failed to save token: ${error.message}`);
}

export async function getProviderToken(
  userId: string,
  provider: string,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date | null } | null> {
  const supabase: any = await createClient();
  const { data, error } = await supabase
    .from('provider_tokens')
    .select()
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error || !data) return null;

  return {
    accessToken: decrypt(data.access_token_encrypted),
    refreshToken: data.refresh_token_encrypted ? decrypt(data.refresh_token_encrypted) : null,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
  };
}

export async function refreshProviderToken(userId: string, provider: string) {
  const existing = await getProviderToken(userId, provider);
  if (!existing?.refreshToken) throw new Error('No refresh token available');

  // For Azure, use the tenant-specific endpoint
  let refreshUrl: string;
  let refreshBody: Record<string, string>;

  if (provider === 'azure') {
    const tenantData = await getProviderToken(userId, 'azure_tenant');
    const tenantId = tenantData?.accessToken ?? 'common'; // accessToken field stores the tenant ID
    refreshUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    refreshBody = {
      grant_type: 'refresh_token',
      refresh_token: existing.refreshToken,
      client_id: process.env.AZURE_CLIENT_ID!.trim(),
      client_secret: process.env.AZURE_CLIENT_SECRET!.trim(),
      scope: 'openid profile offline_access https://management.azure.com/user_impersonation',
    };
  } else {
    const config = getRefreshConfig(provider, existing.refreshToken);
    refreshUrl = config.url;
    refreshBody = config.body;
  }

  const res = await fetch(refreshUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(refreshBody),
  });

  if (!res.ok) throw new Error(`Token refresh failed for ${provider}: ${res.status}`);
  const data = await res.json();

  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
  await saveProviderToken(userId, provider, data.access_token, data.refresh_token ?? existing.refreshToken, expiresAt);

  return data.access_token as string;
}

function getRefreshConfig(provider: string, refreshToken: string): { url: string; body: Record<string, string> } {
  switch (provider) {
    case 'azure':
      return {
        url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        body: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.AZURE_CLIENT_ID!.trim(),
          client_secret: process.env.AZURE_CLIENT_SECRET!.trim(),
          scope: 'openid profile offline_access https://management.azure.com/user_impersonation',
        },
      };
    case 'digitalocean':
    default:
      return {
        url: 'https://cloud.digitalocean.com/v1/oauth/token',
        body: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.DO_CLIENT_ID!,
          client_secret: process.env.DO_CLIENT_SECRET!,
        },
      };
  }
}
