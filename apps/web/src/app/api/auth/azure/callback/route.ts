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
 * Azure OAuth callback — exchanges the authorization code for ARM tokens.
 *
 * The app uses AzureADMultipleOrgs with the /organizations endpoint, so only
 * work/school accounts can sign in. ARM scope is requested directly.
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
    const params = new URLSearchParams({ error: errorMsg });
    if (errorDescription) params.set('error_detail', errorDescription.slice(0, 200));
    if (error !== 'access_denied') params.set('error_code', error);
    return NextResponse.redirect(new URL(`/onboarding?${params.toString()}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/onboarding?error=missing_code', request.url));
  }

  // CSRF check
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

  // Exchange code for ARM tokens via v2.0 endpoint
  // Use /organizations which routes to the user's actual tenant
  const tokenRes = await fetch('https://login.microsoftonline.com/organizations/oauth2/v2.0/token', {
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

    if (errorBody.includes('AADSTS') || errorBody.includes('personal')) {
      return NextResponse.redirect(new URL('/onboarding?error=azure_personal_account', request.url));
    }
    return NextResponse.redirect(new URL('/onboarding?error=token_exchange', request.url));
  }

  const tokenData = await tokenRes.json();

  // Extract tenant ID from the ID token for future token refreshes
  const idToken = tokenData.id_token;
  let tenantId = 'organizations';
  if (idToken) {
    const claims = decodeJwt(idToken);
    if (claims.tid) {
      tenantId = claims.tid as string;
    }
  }

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
