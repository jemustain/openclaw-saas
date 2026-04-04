import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { getProviderToken } from '@/lib/providers/token-store';
import { NextRequest, NextResponse } from 'next/server';
import { apiError, handleApiError, ERR } from '@/lib/errors';

export const maxDuration = 15;

const SIDECAR_PORT = 8788;

const VALID_PROVIDERS = ['gemini', 'openai', 'anthropic', 'github-copilot'];

/**
 * POST /api/assistant/configure-ai
 * Push AI model config to an already-running VM via the sidecar.
 * Body: { provider: string, apiKey?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }

    const body = await request.json();
    const { provider, apiKey } = body ?? {};

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
        { status: 400 },
      );
    }

    // Resolve the API key
    let resolvedKey = apiKey;
    if (!resolvedKey && provider === 'github-copilot') {
      const ghToken = await getProviderToken(session.userId, 'github-copilot');
      resolvedKey = ghToken?.accessToken;
    }

    // Get the user's active assistant
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

    // Call the sidecar's configure-model endpoint
    const sidecarRes = await fetch(
      `http://${assistant.ip_address}:${SIDECAR_PORT}/openclaw/configure-model`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${assistant.sidecar_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, apiKey: resolvedKey }),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!sidecarRes.ok) {
      const err = await sidecarRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to configure AI on VM', details: err },
        { status: 502 },
      );
    }

    const result = await sidecarRes.json();
    return NextResponse.json({ status: 'configured', ...result });
  } catch (err) {
    return handleApiError(err, 'assistant/configure-ai');
  }
}
