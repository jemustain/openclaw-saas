import { NextResponse } from 'next/server';
import { apiError, ERR, handleApiError } from '@/lib/errors';

export async function GET() {
  const clientId = process.env.DO_CLIENT_ID?.trim();
  const redirectUri = process.env.DO_REDIRECT_URI?.trim();

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
