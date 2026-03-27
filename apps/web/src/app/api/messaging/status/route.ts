import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

const SIDECAR_PORT = 8787;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's active assistant
    const supabase: any = createClient();
    const { data: assistant } = await supabase
      .from('assistants')
      .select(
        'id, ip_address, sidecar_token, telegram_bot_username, telegram_bot_token, whatsapp_connected',
      )
      .eq('user_id', session.userId)
      .in('status', ['active', 'running', 'provisioning'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!assistant) {
      return NextResponse.json(
        { error: 'No active assistant found' },
        { status: 404 },
      );
    }

    // Build platform status from stored data
    const platforms: Record<
      string,
      { configured: boolean; connected: boolean; botLink?: string }
    > = {
      telegram: {
        configured: !!assistant.telegram_bot_username,
        connected: false,
        ...(assistant.telegram_bot_username && {
          botLink: `https://t.me/${assistant.telegram_bot_username}`,
        }),
      },
      whatsapp: {
        configured: !!assistant.whatsapp_connected,
        connected: !!assistant.whatsapp_connected,
      },
    };

    // Try to get live status from sidecar
    if (assistant.ip_address && assistant.sidecar_token) {
      try {
        const res = await fetch(
          `http://${assistant.ip_address}:${SIDECAR_PORT}/messaging/status`,
          {
            headers: {
              Authorization: `Bearer ${assistant.sidecar_token}`,
            },
            signal: AbortSignal.timeout(5000),
          },
        );
        if (res.ok) {
          const live = await res.json();
          // Merge live connection status
          if (live.telegram?.connected !== undefined) {
            platforms.telegram.connected = live.telegram.connected;
          }
          if (live.whatsapp?.connected !== undefined) {
            platforms.whatsapp.connected = live.whatsapp.connected;
          }
        }
      } catch {
        // Sidecar unreachable — use stored status only
      }
    }

    return NextResponse.json({ platforms });
  } catch (err: unknown) {
    console.error('Messaging status error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
