import { Router, Request, Response } from 'express';
import { getTodayUsageSummary } from './usage';

const router = Router();

let heartbeatInterval: NodeJS.Timeout | null = null;
let usageReportInterval: NodeJS.Timeout | null = null;
let portalUrl: string | null = null;
let vmId: string | null = null;

/** Whether the portal has indicated this assistant is throttled */
let throttled = false;

export function isThrottled(): boolean {
  return throttled;
}

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
    let usage = { messages_sent: 0, hours_active: 0, api_tokens_used: 0 };
    try { usage = await getTodayUsageSummary(); } catch {}
    await fetch(`${portalUrl}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vmId, ...health, usage }),
    });
  } catch (err) {
    console.error('[heartbeat] Failed to phone home:', (err as Error).message);
  }
}

/**
 * Report usage to the portal every 5 minutes.
 * The portal responds with { throttled } so the sidecar knows to pause.
 */
async function reportUsageToPortal() {
  if (!portalUrl || !vmId) return;

  const sidecarToken = process.env.SIDECAR_TOKEN;
  if (!sidecarToken) return;

  try {
    const usage = await getTodayUsageSummary();
    const res = await fetch(`${portalUrl}/api/usage/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sidecarToken}`,
      },
      body: JSON.stringify({
        assistant_id: vmId,
        messages_sent: usage.messages_sent,
        hours_active: usage.hours_active,
        api_tokens_used: usage.api_tokens_used,
      }),
    });

    if (res.ok) {
      const data = await res.json() as { throttled?: boolean; reason?: string };
      throttled = data.throttled === true;
      if (throttled) {
        console.warn(`[usage] Throttled by portal: ${data.reason ?? 'limit reached'}`);
      }
    }
  } catch (err) {
    console.error('[usage] Failed to report usage:', (err as Error).message);
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

  // Clear existing intervals if re-registering
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (usageReportInterval) clearInterval(usageReportInterval);

  // Send heartbeat immediately, then every 60s
  sendHeartbeat();
  heartbeatInterval = setInterval(sendHeartbeat, 60_000);

  // Report usage immediately, then every 5 minutes
  reportUsageToPortal();
  usageReportInterval = setInterval(reportUsageToPortal, 5 * 60 * 1000);

  res.json({ status: 'registered', portalUrl, vmId, heartbeatMs: 60_000, usageReportMs: 300_000 });
});

export default router;
