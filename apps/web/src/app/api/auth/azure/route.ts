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

  // Use the specific Azure AD tenant endpoint. Personal Microsoft accounts that
  // are members of this tenant can authenticate here and get ARM-scoped tokens.
  // We request ARM scope directly so the code exchange gives us ARM tokens.
  const azureTenantId = process.env.AZURE_TENANT_ID?.trim() || 'organizations';

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid profile offline_access https://management.azure.com/user_impersonation',
    state,
    prompt: 'consent',
  });

  const response = NextResponse.redirect(
    `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/authorize?${params.toString()}`,
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
