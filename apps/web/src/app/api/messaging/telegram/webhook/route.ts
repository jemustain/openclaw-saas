import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export async function POST(request: Request) {
  // Always return 200 to Telegram (it retries on non-200)
  try {
    // Verify webhook secret
    const webhookSecret = env('TELEGRAM_WEBHOOK_SECRET');
    if (webhookSecret) {
      const headerSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (headerSecret !== webhookSecret) {
        console.warn('Telegram webhook: invalid secret');
        return NextResponse.json({ ok: true });
      }
    }

    const body = await request.json();
    const message = body?.message;
    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const text: string = message.text;
    if (!text.startsWith('/start ')) {
      return NextResponse.json({ ok: true });
    }

    const pairingToken = text.slice('/start '.length).trim();
    if (!pairingToken) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const username = message.from?.username || null;

    const supabase = createClient();

    // Look up and update the pairing
    const { data: pairing } = await supabase
      .from('telegram_pairings')
      .select('id, status')
      .eq('pairing_token', pairingToken)
      .single();

    if (pairing && pairing.status === 'pending') {
      await supabase
        .from('telegram_pairings')
        .update({
          telegram_chat_id: chatId,
          telegram_username: username,
          status: 'paired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pairing.id);

      // Reply to the user in Telegram
      const botToken = env('TELEGRAM_BOT_TOKEN');
      if (botToken) {
        await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: "Pairing received! Go back to the web page and click 'Check for Pairing' to confirm.",
            }),
          },
        ).catch((err) => console.error('Failed to send Telegram reply:', err));
      }
    }
  } catch (err) {
    console.error('Telegram webhook error:', err);
  }

  return NextResponse.json({ ok: true });
}
