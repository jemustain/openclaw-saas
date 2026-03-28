import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import WebSocket from 'ws';

const execAsync = promisify(exec);
const router = Router();

type Platform = 'whatsapp' | 'telegram' | 'signal' | 'discord' | 'slack';
const VALID_PLATFORMS: Platform[] = ['whatsapp', 'telegram', 'signal', 'discord', 'slack'];

const CLAW_USER = process.env.OPENCLAW_USER || 'claw';
const CLAW_HOME = process.env.OPENCLAW_HOME || `/home/${CLAW_USER}`;
const GATEWAY_WS_URL = process.env.GATEWAY_WS_URL || 'ws://127.0.0.1:18789';

/** Run a command as the claw user */
async function runAsClaw(cmd: string, timeoutMs = 30_000): Promise<{ stdout: string; stderr: string }> {
  return execAsync(`su - ${CLAW_USER} -c '${cmd.replace(/'/g, "'\\''")}'`, { timeout: timeoutMs });
}

/** Read the gateway auth token from the OpenClaw config */
function getGatewayToken(): string | undefined {
  try {
    const configPath = `${CLAW_HOME}/.openclaw/openclaw.json`;
    if (!existsSync(configPath)) return undefined;
    const config = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
    return config?.gateway?.controlUi?.token
      || config?.gateway?.auth?.token
      || config?.['gateway.controlUi.token']
      || config?.['gateway.auth.token'];
  } catch {
    return undefined;
  }
}

/** Send an RPC call to the gateway WebSocket and return the result */
async function gatewayRpc<T = any>(method: string, params: Record<string, unknown> = {}, timeoutMs = 30_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = getGatewayToken();
    const wsUrl = token ? `${GATEWAY_WS_URL}?token=${encodeURIComponent(token)}` : GATEWAY_WS_URL;

    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Gateway RPC timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Gateway not ready - please wait a moment and try again (${err.message})`));
    });

    ws.on('open', () => {
      const id = Date.now().toString();
      ws.send(JSON.stringify({ id, method, params }));

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.id === id) {
            clearTimeout(timer);
            ws.close();
            if (msg.error) {
              reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              resolve(msg.result as T);
            }
          }
        } catch {}
      });
    });

    ws.on('close', () => {
      clearTimeout(timer);
    });
  });
}

/** Check if WhatsApp credentials exist on disk */
function whatsappCredentialsExist(): boolean {
  const credPath = `${CLAW_HOME}/.openclaw/credentials/whatsapp`;
  return existsSync(credPath);
}

async function setupTelegram(config: { botToken: string }): Promise<{ status: string }> {
  if (!config.botToken || typeof config.botToken !== 'string') {
    throw new Error('Missing botToken for Telegram setup');
  }

  await runAsClaw(`openclaw channels add --channel telegram --token ${config.botToken}`);

  try {
    await execAsync('systemctl restart openclaw-sidecar', { timeout: 15_000 });
    await new Promise(r => setTimeout(r, 5000));
  } catch {
    try { await runAsClaw('openclaw gateway restart'); } catch {}
  }

  return { status: 'configured' };
}

async function setupWhatsApp(_config: Record<string, unknown>): Promise<{ platform: string; status: string; qr?: string; error?: string }> {
  // Check if already connected via credential files
  if (whatsappCredentialsExist()) {
    try {
      const { stdout } = await runAsClaw('openclaw channels status --channel whatsapp 2>/dev/null', 10_000);
      if (stdout.toLowerCase().includes('connected') || stdout.toLowerCase().includes('active') || stdout.toLowerCase().includes('ready')) {
        return { platform: 'whatsapp', status: 'connected' };
      }
    } catch {}
  }

  // Use Gateway WebSocket to start WhatsApp login and get QR
  try {
    const result = await gatewayRpc<{ qrDataUrl?: string; message: string }>(
      'web.login.start',
      { channel: 'whatsapp' },
      30_000
    );

    if (result.qrDataUrl) {
      return { platform: 'whatsapp', status: 'pairing', qr: result.qrDataUrl };
    }

    return { platform: 'whatsapp', status: 'pending' };
  } catch (err: any) {
    return {
      platform: 'whatsapp',
      status: 'failed',
      error: err.message || 'Gateway not ready - please wait a moment and try again',
    };
  }
}

router.post('/messaging/setup', async (req: Request, res: Response) => {
  const { platform, config } = req.body;

  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` });
    return;
  }

  try {
    let result: { status: string; qr?: string; pairingCode?: string; error?: string };

    switch (platform) {
      case 'telegram':
        result = await setupTelegram(config || {});
        break;
      case 'whatsapp':
        result = await setupWhatsApp(config || {});
        break;
      default:
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
    await runAsClaw(`openclaw channels remove --channel ${platform}`);

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

    // Check WhatsApp via credential files + CLI status
    if (whatsappCredentialsExist()) {
      let connected = false;
      try {
        const { stdout } = await runAsClaw('openclaw channels status --channel whatsapp 2>/dev/null', 10_000);
        connected = /connected|active|ready/i.test(stdout);
      } catch {}
      platforms.whatsapp = { configured: true, connected };
    }

    // Check other channels via openclaw channels list
    try {
      const { stdout } = await runAsClaw('openclaw channels list --json 2>/dev/null', 10_000);
      const data = JSON.parse(stdout.trim());
      const channels = Array.isArray(data) ? data : data.channels || [];
      for (const ch of channels) {
        const name = (ch.channel || ch.name || '').toLowerCase();
        if (VALID_PLATFORMS.includes(name as Platform) && !platforms[name]) {
          platforms[name] = {
            configured: true,
            connected: ch.connected !== undefined ? ch.connected : ch.status === 'connected',
          };
        }
      }
    } catch {}

    res.json({ platforms });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get messaging status', details: err.message });
  }
});

// WhatsApp QR polling endpoint — uses Gateway WebSocket
router.get('/messaging/whatsapp/qr', async (_req: Request, res: Response) => {
  try {
    // Check if already connected
    if (whatsappCredentialsExist()) {
      try {
        const { stdout } = await runAsClaw('openclaw channels status --channel whatsapp 2>/dev/null', 5_000);
        if (/connected|ready/i.test(stdout)) {
          res.json({ status: 'connected' });
          return;
        }
      } catch {}
    }

    // Get fresh QR via Gateway WebSocket
    try {
      const result = await gatewayRpc<{ qrDataUrl?: string; message: string }>(
        'web.login.start',
        { channel: 'whatsapp' },
        15_000
      );

      if (result.qrDataUrl) {
        res.json({ status: 'pairing', qr: result.qrDataUrl });
        return;
      }

      res.json({ status: 'pending', message: result.message });
    } catch (err: any) {
      res.json({
        status: 'failed',
        error: err.message || 'Gateway not ready - please wait a moment and try again',
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get WhatsApp QR', details: err.message });
  }
});

export default router;
