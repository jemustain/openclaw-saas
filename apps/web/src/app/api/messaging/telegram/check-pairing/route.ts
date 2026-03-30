import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { apiError, ERR, handleApiError } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }

    const { pairingToken } = (await request.json()) as { pairingToken: string };
    if (!pairingToken) {
      return NextResponse.json({ error: 'pairingToken is required' }, { status: 400 });
    }

    const supabase: any = createClient();

    const { data: pairing } = await supabase
      .from('telegram_pairings')
      .select('status, telegram_username')
      .eq('pairing_token', pairingToken)
      .eq('user_id', session.userId)
      .single();

    if (!pairing) {
      return NextResponse.json({ error: 'Pairing not found' }, { status: 404 });
    }

    if (pairing.status === 'paired') {
      return NextResponse.json({
        paired: true,
        telegramUsername: pairing.telegram_username,
      });
    }

    return NextResponse.json({ paired: false });
  } catch (err) {
    console.error('check-pairing error:', err);
    return apiError(ERR.INTERNAL, 500);
  }
}
