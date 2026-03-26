import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { saveProviderToken } from '@/lib/providers/token-store';
import { listSubscriptions } from '@/lib/providers/azure';

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

  // Exchange code for tokens
  const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.AZURE_CLIENT_ID!.trim(),
      client_secret: process.env.AZURE_CLIENT_SECRET!.trim(),
      redirect_uri: process.env.AZURE_REDIRECT_URI!.trim(),
    }),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text().catch(() => 'no body');
    console.error(
      `Azure token exchange failed: ${tokenRes.status} ${tokenRes.statusText}`,
      `redirect_uri=${process.env.AZURE_REDIRECT_URI}`,
      `body=${errorBody}`,
    );
    return NextResponse.redirect(new URL('/onboarding?error=token_exchange', request.url));
  }

  const tokenData = await tokenRes.json();

  // Get current user from session
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Store encrypted tokens
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await saveProviderToken(
    session.userId,
    'azure',
    tokenData.access_token,
    tokenData.refresh_token ?? null,
    expiresAt,
  );

  // Verify the account works by listing subscriptions
  try {
    const subs = await listSubscriptions(tokenData.access_token);
    const active = subs.find((s) => s.state === 'Enabled');
    if (active) {
      // Store subscription ID as metadata via a separate token entry
      // The subscription ID will be retrieved when needed via validateAccount
      console.log(`Azure connected: subscription ${active.id} (${active.displayName})`);
    }
  } catch (e) {
    console.error('Azure subscription check failed (non-fatal):', e);
  }

  // Clear the state cookie
  const response = NextResponse.redirect(new URL('/onboarding?connected=azure', request.url));
  response.cookies.delete('azure_oauth_state');
  return response;
}
