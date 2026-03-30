import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.' },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const returnTo = url.searchParams.get('returnTo') || '/onboarding?step=7';

  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = JSON.stringify({ returnTo, purpose: 'ai-provider', ts: Date.now(), nonce });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const hmac = crypto.createHmac('sha256', clientSecret).update(payloadB64).digest('base64url');
  const state = `${payloadB64}.${hmac}`;

  const redirectUri = `${url.origin}/api/auth/github/callback`;

  const githubUrl = new URL('https://github.com/login/oauth/authorize');
  githubUrl.searchParams.set('client_id', clientId);
  githubUrl.searchParams.set('redirect_uri', redirectUri);
  githubUrl.searchParams.set('scope', 'copilot');
  githubUrl.searchParams.set('state', state);

  return NextResponse.redirect(githubUrl.toString());
}
