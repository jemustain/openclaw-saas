import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

/**
 * GitHub OAuth callback for Copilot API access.
 *
 * Exchanges the authorization code for an access token,
 * verifies it works with GitHub Models API, and saves it
 * as the user's AI provider credentials.
 *
 * Environment variables required:
 * - GITHUB_CLIENT_ID
 * - GITHUB_CLIENT_SECRET
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');

  // Decode state
  let returnTo = '/onboarding?step=7';
  if (stateParam) {
    try {
      const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
      if (state.returnTo) returnTo = state.returnTo;
    } catch {
      // ignore malformed state
    }
  }

  if (!code) {
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes('?') ? '&' : '?'}error=missing_code`, url.origin));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes('?') ? '&' : '?'}error=oauth_not_configured`, url.origin));
  }

  // Exchange code for access token
  let accessToken: string;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.redirect(
        new URL(`${returnTo}${returnTo.includes('?') ? '&' : '?'}error=token_exchange`, url.origin)
      );
    }
    accessToken = tokenData.access_token;
  } catch {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes('?') ? '&' : '?'}error=token_exchange`, url.origin)
    );
  }

  // Verify the token works with GitHub Models API (Copilot)
  try {
    const testRes = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say hi' }],
        max_tokens: 5,
      }),
    });
    if (!testRes.ok) {
      // Token doesn't have Copilot access - still save it but warn
      console.warn('GitHub token Copilot verification failed:', testRes.status);
    }
  } catch {
    console.warn('GitHub token Copilot verification request failed');
  }

  // Save the token to the user's record
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  try {
    const supabase = createClient();
    await (supabase as any).from('users').update({
      ai_provider: 'github-copilot',
      ai_api_key: accessToken,
    }).eq('id', session.userId);
  } catch (err) {
    console.error('Failed to save GitHub token:', err);
  }

  return NextResponse.redirect(new URL(returnTo, url.origin));
}
