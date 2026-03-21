import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.DO_CLIENT_ID;
  const redirectUri = process.env.DO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'DigitalOcean OAuth not configured' }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read write',
  });

  return NextResponse.redirect(
    `https://cloud.digitalocean.com/v1/oauth/authorize?${params.toString()}`,
  );
}
