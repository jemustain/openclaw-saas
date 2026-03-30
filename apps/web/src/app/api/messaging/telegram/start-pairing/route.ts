import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { apiError, ERR, handleApiError } from '@/lib/errors';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }

    const botUsername = env('TELEGRAM_BOT_USERNAME');
    if (!botUsername) {
      return NextResponse.json(
        { error: 'Telegram bot not configured' },
        { status: 500 },
      );
    }

    const supabase: any = createClient();

    // Find user's active assistant
    const { data: assistant } = await supabase
      .from('assistants')
      .select('id')
      .eq('user_id', session.userId)
      .in('status', ['active', 'provisioning'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!assistant) {
      return NextResponse.json(
        { error: 'No active assistant found' },
        { status: 404 },
      );
    }

    const pairingToken = crypto.randomUUID();

    const { error } = await supabase.from('telegram_pairings').insert({
      user_id: session.userId,
      assistant_id: assistant.id,
      pairing_token: pairingToken,
      status: 'pending',
    });

    if (error) {
      console.error('Failed to create pairing:', error);
      return NextResponse.json(
        { error: 'Failed to create pairing' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      pairingToken,
      botLink: `https://t.me/${botUsername}?start=${pairingToken}`,
    });
  } catch (err) {
    console.error('start-pairing error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
