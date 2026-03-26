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

  // Exchange code for tokens - the code was issued with ARM scope, so
  // the access_token will be an ARM management token directly.
  const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      scope: 'openid profile offline_access https://management.azure.com/user_impersonation',
    }),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text().catch(() => 'no body');
    console.error(`Azure token exchange failed: ${tokenRes.status}`, errorBody);
    return NextResponse.redirect(new URL('/onboarding?error=token_exchange', request.url));
  }

  const tokenData = await tokenRes.json();

  // Extract tenant ID from the id_token for future token refreshes
  const idTokenClaims = tokenData.id_token ? decodeJwt(tokenData.id_token) : {};
  const tenantId = idTokenClaims.tid as string | undefined;

  // Get current user from session
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Store encrypted tokens (ARM-scoped access token)
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

  // Store the tenant ID for future token refreshes (if available)
  if (tenantId) {
    await saveProviderToken(
      session.userId,
      'azure_tenant',
      tenantId,
      null,
      null,
    );
  }

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

  // Clear the state cookie
  const response = NextResponse.redirect(new URL('/onboarding?connected=azure', request.url));
  response.cookies.delete('azure_oauth_state');
  return response;
}
