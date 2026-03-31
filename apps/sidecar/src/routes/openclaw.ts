import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

async function getOpenclawStatus(): Promise<{ running: boolean; version: string; uptime: string }> {
  let running = false;
  let version = 'unknown';
  let uptime = 'unknown';

  try {
    const { stdout } = await execAsync('openclaw --version');
    version = stdout.trim();
  } catch {}

  try {
    await execAsync('systemctl is-active openclaw');
    running = true;
  } catch {
    // Also try pgrep as fallback
    try {
      await execAsync('pgrep -f openclaw');
      running = true;
    } catch {}
  }

  if (running) {
    try {
      const { stdout } = await execAsync("systemctl show openclaw --property=ActiveEnterTimestamp --value");
      uptime = stdout.trim() || 'unknown';
    } catch {}
  }

  return { running, version, uptime };
}

router.get('/openclaw/status', async (_req: Request, res: Response) => {
  const status = await getOpenclawStatus();
  res.json(status);
});

router.post('/openclaw/restart', async (_req: Request, res: Response) => {
  try {
    await execAsync('systemctl restart openclaw');
    res.json({ status: 'restarted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to restart openclaw', details: err.message });
  }
});

router.post('/openclaw/update', async (_req: Request, res: Response) => {
  try {
    await execAsync('npm install -g openclaw@latest');
    // Try both possible service names
    try { await execAsync('systemctl restart openclaw-sidecar'); } catch {
      try { await execAsync('systemctl restart openclaw'); } catch {}
    }
    const { stdout } = await execAsync('openclaw --version');
    res.json({ status: 'updated', version: stdout.trim() });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update openclaw', details: err.message });
  }
});

/** Update the sidecar code itself from GitHub and restart */
router.post('/admin/update-sidecar', async (_req: Request, res: Response) => {
  try {
    const url = 'https://raw.githubusercontent.com/jemustain/openclaw-saas/main/apps/sidecar/dist/sidecar.cjs';
    await execAsync(`curl -sf -L "${url}" -o /opt/shiftworker/sidecar/dist/sidecar.cjs`, { timeout: 30_000 });
    // Restart the sidecar service (this will kill the current process)
    try { await execAsync('systemctl restart shiftworker-sidecar', { timeout: 10_000 }); } catch {}
    res.json({ status: 'updated' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update sidecar', details: err.message });
  }
});

/** Fix OpenClaw config issues (e.g. missing allowFrom for dmPolicy=open) */
router.post('/admin/fix-config', async (_req: Request, res: Response) => {
  try {
    const CLAW_USER = process.env.OPENCLAW_USER || 'claw';
    const configPath = `/home/${CLAW_USER}/.openclaw/openclaw.json`;
    const fs = require('fs');
    
    if (!fs.existsSync(configPath)) {
      res.json({ status: 'no_config' });
      return;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    let fixed = false;
    
    // Fix dmPolicy=open without allowFrom=["*"]
    if (config.channels?.telegram?.dmPolicy === 'open') {
      if (!config.channels.telegram.allowFrom || !config.channels.telegram.allowFrom.includes('*')) {
        config.channels.telegram.allowFrom = ['*'];
        fixed = true;
      }
    }
    
    if (fixed) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      await execAsync(`chown ${CLAW_USER}:${CLAW_USER} ${configPath}`);
    }
    
    res.json({ status: fixed ? 'fixed' : 'ok', fixed });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fix config', details: err.message });
  }
});

export default router;
