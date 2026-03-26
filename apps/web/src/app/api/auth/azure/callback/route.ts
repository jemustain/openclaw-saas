import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { saveProviderToken } from '@/lib/providers/token-store';
import { listSubscriptions } from '@/lib/providers/azure';

/**
 * Decode a JWT without verification to extract claims.
 * We only need the tenant ID (tid) from the id_token.
 */
function decodeJwt(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) return {};
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const storedState = request.cookies.get('azure_oauth_state')?.value;

  if (!code) {
    return NextResponse.redirect(new URL('/onboarding?error=missing_code', request.url));
  }

  // CSRF check
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/onboarding?error=invalid_state', request.url));
  }

  const clientId = process.env.AZURE_CLIENT_ID!.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET!.trim();
  const redirectUri = process.env.AZURE_REDIRECT_URI!.trim();

  // Step 1: Exchange code for identity tokens via /consumers
  // This gives us an id_token with the user's tenant ID and a refresh_token
  const identityRes = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      scope: 'openid profile offline_access',
    }),
  });

  if (!identityRes.ok) {
    const errorBody = await identityRes.text().catch(() => 'no body');
    console.error(`Azure identity token exchange failed: ${identityRes.status}`, errorBody);
    return NextResponse.redirect(new URL('/onboarding?error=token_exchange', request.url));
  }

  const identityData = await identityRes.json();

  // Extract tenant ID from the id_token
  const idTokenClaims = identityData.id_token ? decodeJwt(identityData.id_token) : {};
  const tenantId = idTokenClaims.tid as string | undefined;

  if (!tenantId) {
    console.error('No tenant ID found in id_token');
    return NextResponse.redirect(new URL('/onboarding?error=no_tenant', request.url));
  }

  // Step 2: Use the refresh token to get an ARM management token
  // We use the tenant-specific endpoint so the token is scoped to the user's Azure tenant.
  // The app registration needs Azure Service Management > user_impersonation permission.
  const armRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: identityData.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://management.azure.com/.default offline_access',
    }),
  });

  if (!armRes.ok) {
    const errorBody = await armRes.text().catch(() => 'no body');
    console.error(`Azure ARM token request failed: ${armRes.status}`, errorBody);
    // Don't silently continue - redirect with a clear error so the user knows
    return NextResponse.redirect(new URL('/onboarding?error=azure_no_subscription', request.url));
  }

  const armData = await armRes.json();

  // Get current user from session
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Store the ARM-scoped tokens (these can actually call management APIs)
  const expiresAt = armData.expires_in
    ? new Date(Date.now() + armData.expires_in * 1000)
    : null;

  await saveProviderToken(
    session.userId,
    'azure',
    armData.access_token,
    armData.refresh_token ?? identityData.refresh_token,
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
    const subs = await listSubscriptions(armData.access_token);
    const active = subs.find((s) => s.state === 'Enabled');
    if (active) {
      console.log(`Azure connected: subscription ${active.id} (${active.displayName}) tenant ${tenantId}`);
    } else {
      console.warn('Azure connected but no active subscription found');
    }
  } catch (e) {
    console.error('Azure subscription check failed (non-fatal):', e);
  }

  // Clear the state cookie
  const response = NextResponse.redirect(new URL('/onboarding?connected=azure', request.url));
  response.cookies.delete('azure_oauth_state');
  return response;
}
