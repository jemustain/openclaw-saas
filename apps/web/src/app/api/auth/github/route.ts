import { NextRequest, NextResponse } from 'next/server';

/**
 * GitHub OAuth initiation for Copilot API access.
 *
 * Environment variables required:
 * - GITHUB_CLIENT_ID: from GitHub OAuth App
 * - GITHUB_CLIENT_SECRET: from GitHub OAuth App
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.' },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const returnTo = url.searchParams.get('returnTo') || '/onboarding?step=7';

  const state = Buffer.from(
    JSON.stringify({ returnTo, purpose: 'ai-provider', ts: Date.now() })
  ).toString('base64url');

  const redirectUri = `${url.origin}/api/auth/github/callback`;

  const githubUrl = new URL('https://github.com/login/oauth/authorize');
  githubUrl.searchParams.set('client_id', clientId);
  githubUrl.searchParams.set('redirect_uri', redirectUri);
  githubUrl.searchParams.set('scope', 'copilot');
  githubUrl.searchParams.set('state', state);

  return NextResponse.redirect(githubUrl.toString());
}
