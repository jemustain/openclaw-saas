import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const redirectUri = process.env.AZURE_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Azure OAuth not configured' }, { status: 500 });
  }

  // Anti-CSRF state token
  const state = crypto.randomBytes(32).toString('hex');

  // Use /consumers endpoint for personal Microsoft accounts.
  // We request identity-only scopes here because personal accounts
  // can't request ARM scope directly in the authorize URL.
  // The callback will exchange the refresh token for ARM tokens
  // via the user's tenant-specific endpoint.
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid profile offline_access',
    state,
    prompt: 'consent',
  });

  const response = NextResponse.redirect(
    `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params.toString()}`,
  );
  response.cookies.set('azure_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
