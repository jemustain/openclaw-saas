import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { saveProviderToken } from '@/lib/providers/token-store';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/onboarding?error=missing_code', request.url));
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://cloud.digitalocean.com/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.DO_CLIENT_ID!,
      client_secret: process.env.DO_CLIENT_SECRET!,
      redirect_uri: process.env.DO_REDIRECT_URI!,
    }),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text().catch(() => 'no body');
    console.error(
      `DO token exchange failed: ${tokenRes.status} ${tokenRes.statusText}`,
      `redirect_uri=${process.env.DO_REDIRECT_URI}`,
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
    'digitalocean',
    tokenData.access_token,
    tokenData.refresh_token,
    expiresAt,
  );

  return NextResponse.redirect(new URL('/onboarding?connected=digitalocean', request.url));
}
