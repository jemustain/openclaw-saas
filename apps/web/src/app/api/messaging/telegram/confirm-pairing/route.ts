import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

const SIDECAR_PORT = 8788;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pairingToken } = (await request.json()) as { pairingToken: string };
    if (!pairingToken) {
      return NextResponse.json({ error: 'pairingToken is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Look up the pairing
    const { data: pairing } = await supabase
      .from('telegram_pairings')
      .select('id, assistant_id, telegram_chat_id, status')
      .eq('pairing_token', pairingToken)
      .eq('user_id', session.userId)
      .single();

    if (!pairing) {
      return NextResponse.json({ error: 'Pairing not found' }, { status: 404 });
    }

    if (pairing.status !== 'paired') {
      return NextResponse.json(
        { error: 'Pairing is not in paired status' },
        { status: 400 },
      );
    }

    // Update pairing status to confirmed
    await supabase
      .from('telegram_pairings')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', pairing.id);

    // Store telegram_chat_id on the assistant
    await supabase
      .from('assistants')
      .update({ telegram_chat_id: pairing.telegram_chat_id })
      .eq('id', pairing.assistant_id);

    // Configure the sidecar
    const { data: assistant } = await supabase
      .from('assistants')
      .select('ip_address, sidecar_token')
      .eq('id', pairing.assistant_id)
      .single();

    if (assistant?.ip_address && assistant?.sidecar_token) {
      try {
        const botToken = env('TELEGRAM_BOT_TOKEN');
        const url = `http://${assistant.ip_address}:${SIDECAR_PORT}/messaging/setup`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${assistant.sidecar_token}`,
          },
          body: JSON.stringify({
            platform: 'telegram',
            config: {
              chatId: pairing.telegram_chat_id,
              botToken,
            },
          }),
          signal: AbortSignal.timeout(35_000),
        });
      } catch (err) {
        console.error('Failed to configure sidecar:', err);
        // Don't fail the pairing — sidecar can be configured later
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('confirm-pairing error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
