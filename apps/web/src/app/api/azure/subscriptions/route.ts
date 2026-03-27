import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProviderToken, refreshProviderToken } from '@/lib/providers/token-store';
import { listSubscriptions } from '@/lib/providers/azure';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tokenData = await getProviderToken(session.userId, 'azure');
  if (!tokenData) {
    return NextResponse.json({ error: 'Azure not connected' }, { status: 400 });
  }

  let accessToken = tokenData.accessToken;

  // Refresh if expired or expiring within 5 minutes
  if (tokenData.expiresAt && tokenData.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    accessToken = await refreshProviderToken(session.userId, 'azure');
  }

  try {
    const subs = await listSubscriptions(accessToken);
    return NextResponse.json({ subscriptions: subs });
  } catch (err) {
    console.error('Failed to list Azure subscriptions:', err);
    return NextResponse.json(
      { error: 'Failed to list subscriptions. Please re-connect your Azure account.' },
      { status: 500 },
    );
  }
}
