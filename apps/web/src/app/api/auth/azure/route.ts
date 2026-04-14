import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Azure OAuth — Single-step ARM consent.
 *
 * The app registration is set to AzureADMultipleOrgs (work/school accounts only)
 * which allows requesting ARM scopes directly via the v2.0 endpoint. Users must
 * sign in with a work/school account (e.g. admin@shiftworker.ai), not a personal
 * Microsoft account (@outlook.com, @hotmail.com).
 *
 * Personal Microsoft accounts cannot get ARM tokens regardless of the OAuth
 * endpoint version (v1.0 or v2.0) when going through the MSA tenant.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const redirectUri = process.env.AZURE_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Azure OAuth not configured' }, { status: 500 });
  }

  const statePayload = `arm:common:${crypto.randomBytes(16).toString('hex')}`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid profile offline_access https://management.azure.com/.default',
    state: statePayload,
    prompt: 'select_account',
  });

  const response = NextResponse.redirect(
    `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?${params.toString()}`,
  );
  response.cookies.set('azure_oauth_state', statePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return response;
}
