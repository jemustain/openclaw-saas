import { Router, Request, Response } from 'express';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const execAsync = promisify(exec);
const router = Router();

let sidecarHash = 'unknown';
try {
  const content = readFileSync(resolve(__dirname, '../sidecar.cjs'));
  sidecarHash = createHash('sha256').update(content).digest('hex').slice(0, 12);
} catch {}

async function getDiskUsage(): Promise<{ total: string; used: string; available: string; usePercent: string }> {
  try {
    const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $2,$3,$4,$5}'");
    const [total, used, available, usePercent] = stdout.trim().split(/\s+/);
    return { total, used, available, usePercent };
  } catch {
    return { total: 'unknown', used: 'unknown', available: 'unknown', usePercent: 'unknown' };
  }
}

async function getOpenclawVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync('openclaw --version');
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

async function isOpenclawRunning(): Promise<boolean> {
  try {
    await execAsync('pgrep -f openclaw');
    return true;
  } catch {
    return false;
  }
}

function getCpuUsage(): { model: string; cores: number; loadAvg: number[] } {
  const cpus = os.cpus();
  return {
    model: cpus[0]?.model || 'unknown',
    cores: cpus.length,
    loadAvg: os.loadavg(),
  };
}

function getMemoryUsage(): { totalMB: number; freeMB: number; usedPercent: number } {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    totalMB: Math.round(total / 1024 / 1024),
    freeMB: Math.round(free / 1024 / 1024),
    usedPercent: Math.round((used / total) * 100),
  };
}

router.get('/health', async (_req: Request, res: Response) => {
  const [disk, openclawVersion, openclawRunning] = await Promise.all([
    getDiskUsage(),
    getOpenclawVersion(),
    isOpenclawRunning(),
  ]);

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    sidecarVersion: sidecarHash,
    cpu: getCpuUsage(),
    memory: getMemoryUsage(),
    disk,
    openclaw: {
      version: openclawVersion,
      running: openclawRunning,
    },
  });
});

export default router;
