import { createClient } from '@/lib/supabase/server';

export interface MessagingSetupResult {
  platform: string;
  status: 'configured' | 'pending' | 'failed';
  error?: string;
}

const SIDECAR_PORT = 8787;

async function callSidecar(
  ip: string,
  token: string,
  platform: string,
  config: Record<string, any>,
): Promise<Record<string, any>> {
  const res = await fetch(`http://${ip}:${SIDECAR_PORT}/messaging/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ platform, config }),
    signal: AbortSignal.timeout(35_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Sidecar returned ${res.status}`);
  }

  return res.json();
}

export async function setupWhatsAppForAssistant(
  assistantId: string,
): Promise<MessagingSetupResult & { qr?: string }> {
  const supabase: any = createClient();

  const { data: assistant } = await supabase
    .from('assistants')
    .select('ip_address, sidecar_token, whatsapp_connected')
    .eq('id', assistantId)
    .single();

  if (!assistant?.ip_address || !assistant?.sidecar_token) {
    return { platform: 'whatsapp', status: 'pending', error: 'VM not ready yet' };
  }

  if (assistant.whatsapp_connected) {
    return { platform: 'whatsapp', status: 'configured' };
  }

  try {
    const result = await callSidecar(
      assistant.ip_address,
      assistant.sidecar_token,
      'whatsapp',
      {},
    );

    if (result.status === 'connected') {
      await supabase
        .from('assistants')
        .update({
          whatsapp_connected: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assistantId);
      return { platform: 'whatsapp', status: 'configured' };
    }

    return {
      platform: 'whatsapp',
      status: 'pending',
      qr: (result as any).qr,
    };
  } catch (err: any) {
    return { platform: 'whatsapp', status: 'failed', error: err.message };
  }
}

export async function setupTelegramForAssistant(
  assistantId: string,
  botToken: string,
): Promise<MessagingSetupResult> {
  const supabase: any = createClient();

  const { data: assistant } = await supabase
    .from('assistants')
    .select('ip_address, sidecar_token')
    .eq('id', assistantId)
    .single();

  if (!assistant?.ip_address || !assistant?.sidecar_token) {
    return { platform: 'telegram', status: 'pending', error: 'VM not ready yet' };
  }

  try {
    await callSidecar(assistant.ip_address, assistant.sidecar_token, 'telegram', {
      botToken,
    });
    return { platform: 'telegram', status: 'configured' };
  } catch (err: any) {
    return { platform: 'telegram', status: 'failed', error: err.message };
  }
}
