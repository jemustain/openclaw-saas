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
    await execAsync('systemctl restart openclaw');
    const { stdout } = await execAsync('openclaw --version');
    res.json({ status: 'updated', version: stdout.trim() });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update openclaw', details: err.message });
  }
});

export default router;
