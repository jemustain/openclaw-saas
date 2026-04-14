import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { saveProviderToken } from '@/lib/providers/token-store';
import { listSubscriptions } from '@/lib/providers/azure';

/**
 * Decode a JWT without verification to extract claims.
 */
function decodeJwt(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) return {};
  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

/**
 * Azure OAuth callback — handles both step 1 (tenant discovery) and step 2 (ARM token exchange).
 *
 * The state cookie tells us which step we're in:
 *   - "discover:..." → Step 1: exchange code for ID token, extract tenant, redirect to step 2
 *   - "arm:<tid>:..." → Step 2: exchange code for ARM tokens, store them, done
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const errorDescription = request.nextUrl.searchParams.get('error_description');
  const state = request.nextUrl.searchParams.get('state');
  const storedState = request.cookies.get('azure_oauth_state')?.value;

  // Handle OAuth errors from Microsoft
  if (error) {
    console.error(`Azure OAuth error: ${error} - ${errorDescription}`);
    let errorMsg: string;
    if (error === 'access_denied') {
      errorMsg = 'azure_denied';
    } else if (error === 'consent_required' || error === 'interaction_required') {
      errorMsg = 'azure_consent_required';
    } else {
      errorMsg = 'azure_error';
    }
    // Pass the raw error code and description for debugging
    const params = new URLSearchParams({ error: errorMsg });
    if (errorDescription) params.set('error_detail', errorDescription.slice(0, 200));
    if (error !== 'access_denied') params.set('error_code', error);
    return NextResponse.redirect(new URL(`/onboarding?${params.toString()}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/onboarding?error=missing_code', request.url));
  }

  // CSRF check — log details to help debug cookie-loss issues on mobile
  if (!state || !storedState || state !== storedState) {
    console.error('Azure CSRF check failed:', {
      hasState: !!state,
      hasStoredState: !!storedState,
      statePrefix: state?.split(':')[0],
      storedStatePrefix: storedState?.split(':')[0],
      match: state === storedState,
    });
    return NextResponse.redirect(new URL('/onboarding?error=invalid_state', request.url));
  }

  const clientId = process.env.AZURE_CLIENT_ID!.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET!.trim();
  const redirectUri = process.env.AZURE_REDIRECT_URI!.trim();

  // Parse the state to determine which step we're in
  const isDiscovery = state.startsWith('discover:');
  const isArm = state.startsWith('arm:');

  if (isDiscovery) {
    // ─── Step 1 callback: Exchange code for ID token, extract tenant ID ───
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        scope: 'openid profile',
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text().catch(() => 'no body');
      console.error(`Azure tenant discovery token exchange failed: ${tokenRes.status}`, errorBody);
      return NextResponse.redirect(new URL('/onboarding?error=token_exchange', request.url));
    }

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;
    if (!idToken) {
      console.error('Azure tenant discovery: no id_token in response');
      return NextResponse.redirect(new URL('/onboarding?error=no_id_token', request.url));
    }

    const claims = decodeJwt(idToken);
    const tenantId = claims.tid as string;

    if (!tenantId) {
      console.error('Azure tenant discovery: no tid claim in ID token', claims);
      return NextResponse.redirect(new URL('/onboarding?error=no_tenant', request.url));
    }

    console.log(`Azure tenant discovered: ${tenantId} for user ${claims.preferred_username || claims.email || 'unknown'}`);

    // Redirect to step 2: ARM consent through the user's specific tenant.
    // Clear the discovery state cookie first.
    const response = NextResponse.redirect(
      new URL(`/api/auth/azure?step=arm&tenant=${tenantId}`, request.url),
    );
    response.cookies.delete('azure_oauth_state');
    return response;
  }

  if (isArm) {
    // ─── Step 2 callback: Exchange code for ARM tokens ───
    // Extract tenant ID from state: "arm:<tid>:<random>"
    const tenantId = state.split(':')[1];

    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        scope: 'openid profile offline_access https://management.azure.com/.default',
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text().catch(() => 'no body');
      console.error(`Azure ARM token exchange failed: ${tokenRes.status}`, errorBody);

      // If ARM token fails, it might be a personal account that truly can't get ARM tokens.
      // Provide a helpful error.
      if (errorBody.includes('AADSTS') || errorBody.includes('personal')) {
        return NextResponse.redirect(new URL('/onboarding?error=azure_personal_account', request.url));
      }
      return NextResponse.redirect(new URL('/onboarding?error=token_exchange', request.url));
    }

    const tokenData = await tokenRes.json();

    // Get current user from session
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Store ARM-scoped tokens
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    await saveProviderToken(
      session.userId,
      'azure',
      tokenData.access_token,
      tokenData.refresh_token,
      expiresAt,
    );

    // Store the tenant ID for future token refreshes
    await saveProviderToken(
      session.userId,
      'azure_tenant',
      tenantId,
      null,
      null,
    );

    // Verify the account works by listing subscriptions
    try {
      const subs = await listSubscriptions(tokenData.access_token);
      const active = subs.find((s) => s.state === 'Enabled');
      if (active) {
        console.log(`Azure connected: subscription ${active.id} (${active.displayName}) tenant ${tenantId}`);
      } else {
        console.warn('Azure connected but no active subscription found');
      }
    } catch (e) {
      console.error('Azure subscription check failed (non-fatal):', e);
    }

    // Clear the state cookie and redirect to success
    const response = NextResponse.redirect(new URL('/onboarding?connected=azure', request.url));
    response.cookies.delete('azure_oauth_state');
    return response;
  }

  // Unknown state format
  console.error('Azure callback: unrecognized state format', state);
  return NextResponse.redirect(new URL('/onboarding?error=invalid_state', request.url));
}
