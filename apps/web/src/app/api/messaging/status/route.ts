import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { NextResponse } from 'next/server';
import { apiError, handleApiError, ERR } from '@/lib/errors';

export const maxDuration = 15;

const SIDECAR_PORT = 8788;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }

    const supabase: any = createClient();
    const { data: assistant } = await supabase
      .from('assistants')
      .select(
        'id, ip_address, sidecar_token, telegram_bot_username, telegram_bot_token, whatsapp_connected',
      )
      .eq('user_id', session.userId)
      .in('status', ['active', 'provisioning'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!assistant) {
      return apiError(ERR.NO_ACTIVE_ASSISTANT, 404);
    }

    const platforms: Record<
      string,
      { configured: boolean; connected: boolean; botLink?: string }
    > = {
      telegram: {
        configured: !!assistant.telegram_bot_username,
        // Treat as connected when bot token + username exist in DB.
        // The sidecar being unreachable is a VM health issue, not a
        // Telegram connection issue - the bot is still configured and
        // will work once the VM recovers.
        connected: !!(assistant.telegram_bot_username && assistant.telegram_bot_token),
        ...(assistant.telegram_bot_username && {
          botLink: `https://t.me/${assistant.telegram_bot_username}`,
        }),
      },
      whatsapp: {
        configured: !!assistant.whatsapp_connected,
        connected: !!assistant.whatsapp_connected,
      },
    };

    if (assistant.ip_address && assistant.sidecar_token) {
      try {
        const res = await fetch(
          `http://${assistant.ip_address}:${SIDECAR_PORT}/messaging/status`,
          {
            headers: { Authorization: `Bearer ${assistant.sidecar_token}` },
            signal: AbortSignal.timeout(5000),
          },
        );
        if (res.ok) {
          const live = await res.json();
          const livePlatforms = live.platforms ?? live;
          if (livePlatforms.telegram?.connected !== undefined) {
            platforms.telegram.connected = livePlatforms.telegram.connected;
          }
          if (livePlatforms.whatsapp?.connected !== undefined) {
            platforms.whatsapp.connected = livePlatforms.whatsapp.connected;
          }
        }
      } catch {
        // Sidecar unreachable — use stored status only
      }
    }

    return NextResponse.json({ platforms });
  } catch (err) {
    return handleApiError(err, 'messaging/status');
  }
}
