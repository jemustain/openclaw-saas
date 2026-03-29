import { envRequired } from '../env';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export function getGoogleAuthURL(redirectPath?: string): string {
  const params = new URLSearchParams({
    client_id: envRequired('GOOGLE_CLIENT_ID'),
    redirect_uri: envRequired('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    ...(redirectPath ? { state: redirectPath } : {}),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: envRequired('GOOGLE_CLIENT_ID'),
      client_secret: envRequired('GOOGLE_CLIENT_SECRET'),
      redirect_uri: envRequired('GOOGLE_REDIRECT_URI'),
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return res.json() as Promise<{
    access_token: string;
    id_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to get user info: ${res.statusText}`);
  }

  return res.json();
}
