import { createTelegramBot } from './telegram-bot-factory';
import { createClient } from '../supabase/server';

export interface MessagingSetupResult {
  platform: string;
  status: 'configured' | 'pending' | 'failed';
  botUsername?: string;
  botLink?: string;
  qr?: string;
  error?: string;
}

const SIDECAR_PORT = 8788;

/**
 * Call the sidecar on the user's VM to configure a messaging platform.
 */
async function callSidecar(
  ipAddress: string,
  sidecarToken: string,
  platform: string,
  config: Record<string, unknown>,
): Promise<Record<string, any>> {
  const url = `http://${ipAddress}:${SIDECAR_PORT}/messaging/setup`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sidecarToken}`,
    },
    body: JSON.stringify({ platform, config }),
    signal: AbortSignal.timeout(35_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Sidecar ${platform} setup failed (${res.status}): ${body}`,
    );
  }

  return res.json();
}

/**
 * Set up Telegram for a user's assistant.
 * Creates bot via BotFather automation, configures sidecar, returns link.
 */
export async function setupTelegramForAssistant(
  assistantId: string,
  userId: string,
  displayName?: string,
): Promise<MessagingSetupResult> {
  const supabase = await createClient();

  // Get assistant details
  const { data: assistant } = await (supabase as any)
    .from('assistants')
    .select(
      'ip_address, sidecar_token, telegram_bot_username, telegram_bot_token',
    )
    .eq('id', assistantId)
    .single();

  if (!assistant?.ip_address || !assistant?.sidecar_token) {
    return {
      platform: 'telegram',
      status: 'pending',
      error: 'VM not ready yet',
    };
  }

  // Check if bot already exists for this assistant
  if (assistant.telegram_bot_username && assistant.telegram_bot_token) {
    // Re-configure sidecar with existing bot (in case of restart)
    try {
      await callSidecar(
        assistant.ip_address,
        assistant.sidecar_token,
        'telegram',
        { botToken: assistant.telegram_bot_token },
      );
    } catch {
      // Best-effort reconfiguration
    }

    return {
      platform: 'telegram',
      status: 'configured',
      botUsername: assistant.telegram_bot_username,
      botLink: `https://t.me/${assistant.telegram_bot_username}`,
    };
  }

  try {
    // Check if BotFather automation is configured
    const hasBotFactory = !!(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH && process.env.TELEGRAM_SESSION_STRING);

    if (hasBotFactory) {
      // Create bot via BotFather automation
      const bot = await createTelegramBot(userId, displayName);

      // Configure sidecar
      await callSidecar(
        assistant.ip_address,
        assistant.sidecar_token,
        'telegram',
        { botToken: bot.botToken },
      );

      // Store bot details in assistant record
      await (supabase as any)
        .from('assistants')
        .update({
          telegram_bot_username: bot.botUsername,
          telegram_bot_token: bot.botToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assistantId);

      return {
        platform: 'telegram',
        status: 'configured',
        botUsername: bot.botUsername,
        botLink: `https://t.me/${bot.botUsername}`,
      };
    } else {
      // BotFather automation not configured - return manual setup instructions
      return {
        platform: 'telegram',
        status: 'pending',
        error: 'manual_setup_required',
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { platform: 'telegram', status: 'failed', error: message };
  }
}

/**
 * Set up Telegram with a user-provided bot token.
 * Skips BotFather automation - user creates their own bot.
 */
export async function setupTelegramWithToken(
  assistantId: string,
  botToken: string,
): Promise<MessagingSetupResult> {
  const supabase = createClient();

  const { data: assistant } = await (supabase as any)
    .from('assistants')
    .select('ip_address, sidecar_token')
    .eq('id', assistantId)
    .single();

  if (!assistant?.ip_address || !assistant?.sidecar_token) {
    return { platform: 'telegram', status: 'pending', error: 'VM not ready yet' };
  }

  try {
    await callSidecar(assistant.ip_address, assistant.sidecar_token, 'telegram', { botToken });

    // Extract bot username from token (format: <id>:<hash>)
    // We can get it from the Telegram getMe API
    let botUsername = '';
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const meData = await meRes.json();
      if (meData.ok && meData.result?.username) {
        botUsername = meData.result.username;
      }
    } catch {}

    // Store in DB
    await (supabase as any)
      .from('assistants')
      .update({
        telegram_bot_token: botToken,
        ...(botUsername ? { telegram_bot_username: botUsername } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', assistantId);

    return {
      platform: 'telegram',
      status: 'configured',
      ...(botUsername ? { botUsername, botLink: `https://t.me/${botUsername}` } : {}),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { platform: 'telegram', status: 'failed', error: message };
  }
}

/**
 * Set up WhatsApp for a user's assistant.
 * Triggers QR code generation on the sidecar.
 */
export async function setupWhatsAppForAssistant(
  assistantId: string,
): Promise<MessagingSetupResult> {
  const supabase = await createClient();

  const { data: assistant } = await (supabase as any)
    .from('assistants')
    .select('ip_address, sidecar_token, whatsapp_connected')
    .eq('id', assistantId)
    .single();

  if (!assistant?.ip_address || !assistant?.sidecar_token) {
    return {
      platform: 'whatsapp',
      status: 'pending',
      error: 'VM not ready yet',
    };
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
      await (supabase as any)
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
      qr: result.qr as string,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { platform: 'whatsapp', status: 'failed', error: message };
  }
}
