import { Router, Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

type Platform = 'whatsapp' | 'telegram' | 'signal' | 'discord' | 'slack';
const VALID_PLATFORMS: Platform[] = ['whatsapp', 'telegram', 'signal', 'discord', 'slack'];

// Home dir for the claw user (OpenClaw runs as this user)
const CLAW_USER = process.env.OPENCLAW_USER || 'claw';

/** Run a command as the claw user */
async function runAsClaw(cmd: string, timeoutMs = 30_000): Promise<{ stdout: string; stderr: string }> {
  return execAsync(`su - ${CLAW_USER} -c '${cmd.replace(/'/g, "'\\''")}'`, { timeout: timeoutMs });
}

async function setupTelegram(config: { botToken: string }): Promise<{ status: string }> {
  if (!config.botToken || typeof config.botToken !== 'string') {
    throw new Error('Missing botToken for Telegram setup');
  }

  // Use openclaw channels add to configure the Telegram bot
  await runAsClaw(`openclaw channels add --channel telegram --token ${config.botToken}`);

  // Restart the gateway to pick up the new channel
  try {
    await execAsync('systemctl restart openclaw-sidecar', { timeout: 15_000 });
    // Wait for restart
    await new Promise(r => setTimeout(r, 5000));
  } catch {
    // If systemctl fails, try restarting via openclaw CLI
    try { await runAsClaw('openclaw gateway restart'); } catch {}
  }

  return { status: 'configured' };
}

async function setupWhatsApp(_config: Record<string, unknown>): Promise<{ status: string; qr?: string; pairingCode?: string }> {
  // First check if already connected
  try {
    const { stdout } = await runAsClaw('openclaw channels status --channel whatsapp 2>/dev/null', 10_000);
    if (stdout.toLowerCase().includes('connected') || stdout.toLowerCase().includes('active') || stdout.toLowerCase().includes('ready')) {
      return { status: 'connected' };
    }
  } catch {}

  // Enable WhatsApp channel if not already configured
  try {
    await runAsClaw('openclaw channels add --channel whatsapp');
  } catch {
    // May already be configured
  }

  // Restart to ensure WhatsApp plugin is loaded
  try {
    await execAsync('systemctl restart openclaw-sidecar', { timeout: 15_000 });
    await new Promise(r => setTimeout(r, 5000));
  } catch {}

  // Try to get QR code via the login command
  try {
    const { stdout } = await runAsClaw('openclaw channels login --channel whatsapp --json 2>/dev/null', 30_000);
    try {
      const data = JSON.parse(stdout.trim());
      if (data.qr) return { status: 'pairing', qr: data.qr };
      if (data.pairingCode) return { status: 'pairing', pairingCode: data.pairingCode };
    } catch {
      // Not JSON, try to use raw output
      const trimmed = stdout.trim();
      if (trimmed.length > 20) return { status: 'pairing', qr: trimmed };
    }
  } catch {}

  return { status: 'pending' };
}

router.post('/messaging/setup', async (req: Request, res: Response) => {
  const { platform, config } = req.body;

  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` });
    return;
  }

  try {
    let result: { status: string; qr?: string; pairingCode?: string };

    switch (platform) {
      case 'telegram':
        result = await setupTelegram(config || {});
        break;
      case 'whatsapp':
        result = await setupWhatsApp(config || {});
        break;
      default:
        // For other platforms, try generic channels add
        if (config?.token) {
          await runAsClaw(`openclaw channels add --channel ${platform} --token ${config.token}`);
        } else {
          await runAsClaw(`openclaw channels add --channel ${platform}`);
        }
        try {
          await execAsync('systemctl restart openclaw-sidecar', { timeout: 15_000 });
          await new Promise(r => setTimeout(r, 3000));
        } catch {}
        result = { status: 'configured' };
        break;
    }

    res.json({ platform, ...result });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to setup ${platform}`, details: err.message });
  }
});

router.post('/messaging/teardown', async (req: Request, res: Response) => {
  const { platform } = req.body;

  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` });
    return;
  }

  try {
    // Remove the channel via openclaw CLI
    await runAsClaw(`openclaw channels remove --channel ${platform}`);

    // Restart gateway to apply changes
    try {
      await execAsync('systemctl restart openclaw-sidecar', { timeout: 15_000 });
      await new Promise(r => setTimeout(r, 3000));
    } catch {
      try { await runAsClaw('openclaw gateway restart'); } catch {}
    }

    res.json({ status: 'removed', platform });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to teardown ${platform}`, details: err.message });
  }
});

router.get('/messaging/status', async (_req: Request, res: Response) => {
  try {
    const platforms: Record<string, { configured: boolean; connected: boolean }> = {};

    // Use openclaw channels list to check configured channels
    try {
      const { stdout } = await runAsClaw('openclaw channels list --json 2>/dev/null', 10_000);
      const data = JSON.parse(stdout.trim());
      const channels = Array.isArray(data) ? data : data.channels || [];
      for (const ch of channels) {
        const name = (ch.channel || ch.name || '').toLowerCase();
        if (VALID_PLATFORMS.includes(name as Platform)) {
          platforms[name] = {
            configured: true,
            connected: ch.connected !== undefined ? ch.connected : ch.status === 'connected',
          };
        }
      }
    } catch {
      // Channels list failed, return empty
    }

    res.json({ platforms });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get messaging status', details: err.message });
  }
});

// WhatsApp QR polling endpoint
router.get('/messaging/whatsapp/qr', async (_req: Request, res: Response) => {
  try {
    // Check if connected
    try {
      const { stdout } = await runAsClaw('openclaw channels status --channel whatsapp 2>/dev/null', 5_000);
      if (stdout.toLowerCase().includes('connected') || stdout.toLowerCase().includes('ready')) {
        res.json({ status: 'connected' });
        return;
      }
    } catch {}

    // Get fresh QR
    try {
      const { stdout } = await runAsClaw('openclaw channels login --channel whatsapp --json 2>/dev/null', 15_000);
      const data = JSON.parse(stdout.trim());
      if (data.qr) { res.json({ status: 'pairing', qr: data.qr }); return; }
      if (data.pairingCode) { res.json({ status: 'pairing', pairingCode: data.pairingCode }); return; }
    } catch {}

    res.json({ status: 'pending' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get WhatsApp QR', details: err.message });
  }
});

export default router;
