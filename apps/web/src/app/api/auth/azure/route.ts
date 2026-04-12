import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Azure OAuth — Step 1 (tenant discovery) or Step 2 (ARM consent).
 *
 * Problem: Personal Microsoft accounts (@outlook.com, @hotmail.com, etc.) cannot
 * get ARM tokens through the /common endpoint because Microsoft treats them as
 * consumer accounts. But every personal account that has an Azure subscription
 * also has a work/school identity inside an auto-created Azure AD tenant.
 *
 * Solution — two-step sign-in:
 *   Step 1: Redirect to /common with just openid+profile scope (works for ALL
 *           account types). The callback extracts the tenant ID from the ID token.
 *   Step 2: Redirect again through /{{tenant-id}} with ARM scope. Going through
 *           the user's specific tenant makes Microsoft recognize their work/school
 *           identity and issue ARM tokens, even for personal accounts.
 *
 * Query params:
 *   ?step=arm&tenant=<tid>  — Skip to step 2 (ARM consent) with a known tenant.
 *   (none)                  — Start at step 1 (tenant discovery).
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const redirectUri = process.env.AZURE_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Azure OAuth not configured' }, { status: 500 });
  }

  const step = request.nextUrl.searchParams.get('step');
  const tenantHint = request.nextUrl.searchParams.get('tenant');

  // Anti-CSRF state token — encode the step so the callback knows what to do
  const statePayload = step === 'arm' && tenantHint
    ? `arm:${tenantHint}:${crypto.randomBytes(16).toString('hex')}`
    : `discover:${crypto.randomBytes(16).toString('hex')}`;

  if (step === 'arm' && tenantHint) {
    // ─── Step 2: ARM consent through the user's specific tenant ───
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'openid profile offline_access https://management.azure.com/user_impersonation',
      state: statePayload,
      prompt: 'consent',
      // login_hint could be added here if we stored the email from step 1
    });

    const response = NextResponse.redirect(
      `https://login.microsoftonline.com/${tenantHint}/oauth2/v2.0/authorize?${params.toString()}`,
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

  // ─── Step 1: Tenant discovery via /common (works for all account types) ───
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid profile',
    state: statePayload,
    prompt: 'select_account',
  });

  const response = NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`,
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
