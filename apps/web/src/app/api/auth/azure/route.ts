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

  // Step 1: Use /common with openid scope only — this accepts ALL Microsoft account types
  // (personal, work, school). We'll get the tenant ID from the id_token in the callback,
  // then request ARM tokens via the tenant-specific endpoint.
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid profile offline_access',
    state,
    prompt: 'select_account',
  });

  const response = NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`,
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
