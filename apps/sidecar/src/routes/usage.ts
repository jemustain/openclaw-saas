import { Router, Request, Response } from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

const router = Router();

const USAGE_FILE = process.env.USAGE_FILE || '/var/lib/shiftworker/usage.json';

interface DailyUsage {
  date: string;
  messages_sent: number;
  active_minutes: number;
  api_tokens_used: number;
  last_activity: string;
}

interface UsageStore {
  [date: string]: DailyUsage;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readUsageStore(): Promise<UsageStore> {
  try {
    const raw = await readFile(USAGE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeUsageStore(store: UsageStore): Promise<void> {
  await mkdir(dirname(USAGE_FILE), { recursive: true });
  await writeFile(USAGE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function getOrCreateToday(store: UsageStore): DailyUsage {
  const key = todayKey();
  if (!store[key]) {
    store[key] = {
      date: key,
      messages_sent: 0,
      active_minutes: 0,
      api_tokens_used: 0,
      last_activity: new Date().toISOString(),
    };
  }
  return store[key];
}

router.post('/usage/increment', async (req: Request, res: Response) => {
  const { messages = 1, tokens = 0 } = req.body || {};

  try {
    const store = await readUsageStore();
    const today = getOrCreateToday(store);

    today.messages_sent += typeof messages === 'number' ? messages : 1;
    today.api_tokens_used += typeof tokens === 'number' ? tokens : 0;

    // Track active time: if last activity was within 5 min, add the gap
    const now = new Date();
    const lastActivity = new Date(today.last_activity);
    const gapMinutes = (now.getTime() - lastActivity.getTime()) / 60_000;
    if (gapMinutes > 0 && gapMinutes <= 5) {
      today.active_minutes += gapMinutes;
    } else if (gapMinutes > 5) {
      // New activity session, count 1 minute
      today.active_minutes += 1;
    }
    today.last_activity = now.toISOString();

    await writeUsageStore(store);

    res.json({ status: 'ok', today });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to increment usage', details: err.message });
  }
});

router.get('/usage/today', async (_req: Request, res: Response) => {
  try {
    const store = await readUsageStore();
    const key = todayKey();
    const today = store[key] || {
      date: key,
      messages_sent: 0,
      active_minutes: 0,
      api_tokens_used: 0,
      last_activity: null,
    };

    res.json({
      messages_sent: today.messages_sent,
      hours_active: Math.round((today.active_minutes / 60) * 100) / 100,
      api_tokens_used: today.api_tokens_used,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read usage', details: err.message });
  }
});

/** Exported for heartbeat to include usage data when phoning home */
export async function getTodayUsageSummary(): Promise<{ messages_sent: number; hours_active: number; api_tokens_used: number }> {
  const store = await readUsageStore();
  const today = store[todayKey()];
  if (!today) return { messages_sent: 0, hours_active: 0, api_tokens_used: 0 };
  return {
    messages_sent: today.messages_sent,
    hours_active: Math.round((today.active_minutes / 60) * 100) / 100,
    api_tokens_used: today.api_tokens_used,
  };
}

export default router;
