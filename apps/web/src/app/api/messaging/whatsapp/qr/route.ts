import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { apiError, ERR, handleApiError } from '@/lib/errors';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return apiError(ERR.UNAUTHORIZED, 401);
  }

  const supabase: any = createClient();
  const { data: assistant } = await supabase
    .from('assistants')
    .select('id, ip_address, sidecar_token, status')
    .eq('user_id', session.userId)
    .neq('status', 'destroyed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!assistant?.ip_address || !assistant?.sidecar_token) {
    return NextResponse.json({ status: 'pending', error: 'VM not ready' });
  }

  try {
    const SIDECAR_PORT = 8787;
    const res = await fetch(
      `http://${assistant.ip_address}:${SIDECAR_PORT}/messaging/whatsapp/qr`,
      {
        headers: { Authorization: `Bearer ${assistant.sidecar_token}` },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      return NextResponse.json({ status: 'pending' });
    }

    const data = await res.json();

    // If connected, update DB
    if (data.status === 'connected') {
      await supabase
        .from('assistants')
        .update({
          whatsapp_connected: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assistant.id);
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'pending' });
  }
}
