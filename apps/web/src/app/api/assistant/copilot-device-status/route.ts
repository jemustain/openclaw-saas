import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { apiError, handleApiError, ERR } from '@/lib/errors';

export const maxDuration = 15;

const SIDECAR_PORT = 8788;

/**
 * GET /api/assistant/copilot-device-status
 * Poll GitHub Copilot device flow status on the user's VM.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }

    const supabase: any = createClient();
    const { data: assistant } = await supabase
      .from('assistants')
      .select('id, ip_address, sidecar_token')
      .eq('user_id', session.userId)
      .in('status', ['active', 'provisioning'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!assistant?.ip_address || !assistant?.sidecar_token) {
      return apiError(ERR.NO_ACTIVE_ASSISTANT, 404);
    }

    const sidecarRes = await fetch(
      `http://${assistant.ip_address}:${SIDECAR_PORT}/openclaw/github-copilot-device-status`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${assistant.sidecar_token}`,
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!sidecarRes.ok) {
      const err = await sidecarRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to check device flow status', details: err },
        { status: 502 },
      );
    }

    const data = await sidecarRes.json();
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'assistant/copilot-device-status');
  }
}
