import { Router, Request, Response } from 'express';

const router = Router();

let heartbeatInterval: NodeJS.Timeout | null = null;
let portalUrl: string | null = null;
let vmId: string | null = null;

async function collectHealthData() {
  const os = await import('os');
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  let openclawRunning = false;
  try {
    await execAsync('pgrep -f openclaw');
    openclawRunning = true;
  } catch {}

  const total = os.totalmem();
  const free = os.freemem();

  return {
    uptime: process.uptime(),
    cpu: { cores: os.cpus().length, loadAvg: os.loadavg() },
    memory: {
      totalMB: Math.round(total / 1024 / 1024),
      freeMB: Math.round(free / 1024 / 1024),
      usedPercent: Math.round(((total - free) / total) * 100),
    },
    openclaw: { running: openclawRunning },
    timestamp: new Date().toISOString(),
  };
}

async function sendHeartbeat() {
  if (!portalUrl || !vmId) return;

  try {
    const health = await collectHealthData();
    await fetch(`${portalUrl}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vmId, ...health }),
    });
  } catch (err) {
    console.error('[heartbeat] Failed to phone home:', (err as Error).message);
  }
}

router.post('/heartbeat/register', (req: Request, res: Response) => {
  const { url, id } = req.body;

  if (!url || !id) {
    res.status(400).json({ error: 'Missing url or id in body' });
    return;
  }

  portalUrl = url;
  vmId = id;

  // Clear existing interval if re-registering
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  // Send immediately, then every 60s
  sendHeartbeat();
  heartbeatInterval = setInterval(sendHeartbeat, 60_000);

  res.json({ status: 'registered', portalUrl, vmId, intervalMs: 60_000 });
});

export default router;
