import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@/lib/auth/session';
import { saveProviderToken } from '@/lib/providers/token-store';
import { createClient } from '@/lib/supabase/server';

const MAX_STATE_AGE_MS = 10 * 60 * 1000;

function verifyState(stateParam: string, secret: string): { returnTo: string } | null {
  const dotIdx = stateParam.indexOf('.');
  if (dotIdx === -1) return null;
  const payloadB64 = stateParam.slice(0, dotIdx);
  const hmac = stateParam.slice(dotIdx + 1);
  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  if (hmac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) return null;
  try {
    const state = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (typeof state.ts === 'number' && Date.now() - state.ts > MAX_STATE_AGE_MS) return null;
    return { returnTo: state.returnTo || '/onboarding?step=7' };
  } catch {
    return null;
  }
}

function redirectWithError(origin: string, returnTo: string, error: string) {
  const sep = returnTo.includes('?') ? '&' : '?';
  return NextResponse.redirect(new URL(`${returnTo}${sep}error=${error}`, origin));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const defaultReturn = '/onboarding?step=7';

  if (errorParam) {
    let returnTo = defaultReturn;
    if (stateParam && clientSecret) {
      const verified = verifyState(stateParam, clientSecret);
      if (verified) returnTo = verified.returnTo;
    }
    return redirectWithError(url.origin, returnTo, errorParam === 'access_denied' ? 'access_denied' : 'github_error');
  }

  if (!clientId || !clientSecret) {
    return redirectWithError(url.origin, defaultReturn, 'oauth_not_configured');
  }

  if (!stateParam) {
    return redirectWithError(url.origin, defaultReturn, 'invalid_state');
  }

  const stateResult = verifyState(stateParam, clientSecret);
  if (!stateResult) {
    return redirectWithError(url.origin, defaultReturn, 'invalid_state');
  }

  const { returnTo } = stateResult;

  if (!code) {
    return redirectWithError(url.origin, returnTo, 'missing_code');
  }

  let accessToken: string;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    if (!tokenRes.ok) {
      console.error('GitHub token exchange HTTP error:', tokenRes.status);
      return redirectWithError(url.origin, returnTo, 'token_exchange');
    }
    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token exchange error:', tokenData.error, tokenData.error_description, 'client_id_len:', clientId?.length, 'secret_len:', clientSecret?.length);
      return redirectWithError(url.origin, returnTo, 'token_exchange');
    }
    accessToken = tokenData.access_token;
  } catch (err) {
    console.error('GitHub token exchange fetch error:', err);
    return redirectWithError(url.origin, returnTo, 'token_exchange');
  }

  let copilotVerified = false;
  try {
    const testRes = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Say hi' }], max_tokens: 5 }),
    });
    copilotVerified = testRes.ok;
    if (!copilotVerified) console.warn('GitHub token Copilot verification failed:', testRes.status);
  } catch {
    console.warn('GitHub token Copilot verification request failed');
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  try {
    await saveProviderToken(session.userId, 'github-copilot', accessToken, null, null);
    // Also update the user's ai_provider so the dashboard shows connected status
    const supabase: any = await createClient();
    await supabase
      .from('users')
      .update({ provider_preference: 'github-copilot' })
      .eq('id', session.userId);
  } catch (err) {
    console.error('Failed to save GitHub token:', err);
    return redirectWithError(url.origin, returnTo, 'save_failed');
  }

  const sep = returnTo.includes('?') ? '&' : '?';
  const successUrl = copilotVerified
    ? `${returnTo}${sep}github=connected`
    : `${returnTo}${sep}github=connected&copilot_warning=true`;
  return NextResponse.redirect(new URL(successUrl, url.origin));
}
