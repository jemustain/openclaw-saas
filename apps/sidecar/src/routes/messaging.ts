import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);
const router = Router();

type Platform = 'whatsapp' | 'telegram' | 'signal' | 'discord' | 'slack';
const VALID_PLATFORMS: Platform[] = ['whatsapp', 'telegram', 'signal', 'discord', 'slack'];

const OPENCLAW_CONFIG_PATH = join(process.env.HOME || '/root', '.openclaw/openclaw.json');

async function readOpenclawConfig(): Promise<Record<string, any>> {
  try {
    const raw = await readFile(OPENCLAW_CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeOpenclawConfig(config: Record<string, any>): Promise<void> {
  const dir = join(process.env.HOME || '/root', '.openclaw');
  await mkdir(dir, { recursive: true });
  await writeFile(OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

async function setupTelegram(config: { botToken: string }): Promise<{ status: string }> {
  if (!config.botToken || typeof config.botToken !== 'string') {
    throw new Error('Missing botToken for Telegram setup');
  }

  const clawConfig = await readOpenclawConfig();
  if (!clawConfig.plugins) clawConfig.plugins = {};
  if (!clawConfig.plugins.entries) clawConfig.plugins.entries = {};
  clawConfig.plugins.entries.telegram = {
    enabled: true,
    config: { botToken: config.botToken },
  };
  await writeOpenclawConfig(clawConfig);

  // Restart openclaw to pick up new config
  try {
    await execAsync('systemctl restart openclaw');
  } catch {
    try { await execAsync('openclaw gateway restart'); } catch {}
  }

  return { status: 'configured' };
}

async function setupWhatsApp(_config: Record<string, any>): Promise<{ status: string; qr?: string }> {
  // WhatsApp pairing typically goes through openclaw's device-pair flow
  try {
    const { stdout } = await execAsync('openclaw whatsapp status 2>/dev/null', { timeout: 10_000 });
    if (stdout.includes('connected')) {
      return { status: 'connected' };
    }
  } catch {}

  // Trigger QR generation
  try {
    const { stdout } = await execAsync('openclaw whatsapp pair 2>/dev/null', { timeout: 15_000 });
    return { status: 'pairing', qr: stdout.trim() };
  } catch {
    return { status: 'pending', qr: undefined };
  }
}

async function setupGeneric(platform: string, config: Record<string, any>): Promise<{ status: string }> {
  const clawConfig = await readOpenclawConfig();
  if (!clawConfig.plugins) clawConfig.plugins = {};
  if (!clawConfig.plugins.entries) clawConfig.plugins.entries = {};
  clawConfig.plugins.entries[platform] = {
    enabled: true,
    config,
  };
  await writeOpenclawConfig(clawConfig);

  try {
    await execAsync('systemctl restart openclaw');
  } catch {
    try { await execAsync('openclaw gateway restart'); } catch {}
  }

  return { status: 'configured' };
}

router.post('/messaging/setup', async (req: Request, res: Response) => {
  const { platform, config } = req.body;

  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` });
    return;
  }

  if (!config || typeof config !== 'object') {
    res.status(400).json({ error: 'Missing config object' });
    return;
  }

  try {
    let result: { status: string; qr?: string };

    switch (platform) {
      case 'telegram':
        result = await setupTelegram(config);
        break;
      case 'whatsapp':
        result = await setupWhatsApp(config);
        break;
      default:
        result = await setupGeneric(platform, config);
        break;
    }

    res.json({ platform, ...result });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to setup ${platform}`, details: err.message });
  }
});

router.get('/messaging/status', async (_req: Request, res: Response) => {
  try {
    const config = await readOpenclawConfig();
    const entries = config?.plugins?.entries || {};
    const platforms: Record<string, { enabled: boolean; connected: boolean }> = {};

    for (const p of VALID_PLATFORMS) {
      const entry = entries[p];
      if (entry) {
        let connected = false;
        try {
          const { stdout } = await execAsync(`openclaw ${p} status 2>/dev/null`, { timeout: 5_000 });
          connected = stdout.toLowerCase().includes('connected') || stdout.toLowerCase().includes('active');
        } catch {}

        platforms[p] = { enabled: !!entry.enabled, connected };
      }
    }

    res.json({ platforms });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get messaging status', details: err.message });
  }
});

export default router;
