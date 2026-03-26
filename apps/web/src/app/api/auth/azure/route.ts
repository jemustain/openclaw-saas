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

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'https://management.azure.com/.default offline_access openid profile',
    state,
    // Prompt account selection so users can pick their Azure-linked account
    prompt: 'select_account',
  });

  // Use /common — works for both single-tenant and multi-tenant org accounts.
  // Personal Microsoft accounts (outlook.com, gmail) get an Azure AD directory
  // when they create a subscription, making them org accounts for ARM purposes.
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
