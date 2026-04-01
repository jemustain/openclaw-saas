import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProviderToken, refreshProviderToken } from '@/lib/providers/token-store';

export const maxDuration = 60;

/** Check if a cron secret is required and valid */
function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // No secret configured, allow
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/** Get current hour in user's timezone */
function currentHourInTimezone(tz: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false });
    return parseInt(formatter.format(now), 10);
  } catch {
    return new Date().getHours(); // fallback to UTC
  }
}

/** Check if current time is within the user's active window */
function isInActiveWindow(windowStart: number, tz: string): boolean {
  const currentHour = currentHourInTimezone(tz);
  const windowEnd = (windowStart + 8) % 24;
  if (windowStart < windowEnd) {
    return currentHour >= windowStart && currentHour < windowEnd;
  }
  // Window wraps around midnight
  return currentHour >= windowStart || currentHour < windowEnd;
}

async function azureFetch(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`https://management.azure.com${path}?api-version=2024-07-01`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    },
    signal: AbortSignal.timeout(30000),
  });
  return res;
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase: any = createClient();

  // Get free-plan users with active or suspended assistants
  const { data: users } = await supabase
    .from('users')
    .select('id, plan, window_start, timezone')
    .eq('plan', 'free');

  if (!users || users.length === 0) {
    return NextResponse.json({ message: 'No free-plan users', processed: 0 });
  }

  const results: { userId: string; action: string; error?: string }[] = [];

  for (const user of users) {
    const windowStart = user.window_start ?? 9;
    const tz = user.timezone ?? 'America/Phoenix';
    const inWindow = isInActiveWindow(windowStart, tz);

    // Get their assistant
    const { data: assistant } = await supabase
      .from('assistants')
      .select('id, status, vm_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'suspended'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!assistant?.vm_id) continue;

    try {
      if (!inWindow && assistant.status === 'active') {
        // Outside window + active → suspend
        let azureToken: string | undefined;
        try {
          const tokenData = await getProviderToken(user.id, 'azure');
          azureToken = tokenData?.accessToken;
          if (!azureToken) {
            azureToken = await refreshProviderToken(user.id, 'azure');
          }
        } catch {
          // Try refresh
          try { azureToken = await refreshProviderToken(user.id, 'azure'); } catch {}
        }

        if (azureToken) {
          const res = await azureFetch(azureToken, `${assistant.vm_id}/deallocate`, { method: 'POST' });
          if (res.ok || res.status === 202) {
            await supabase.from('assistants').update({ status: 'suspended' }).eq('id', assistant.id);
            results.push({ userId: user.id, action: 'suspended' });
          } else {
            results.push({ userId: user.id, action: 'suspend_failed', error: `HTTP ${res.status}` });
          }
        } else {
          results.push({ userId: user.id, action: 'skip', error: 'No Azure token' });
        }
      } else if (inWindow && assistant.status === 'suspended') {
        // Inside window + suspended → start
        let azureToken: string | undefined;
        try {
          const tokenData = await getProviderToken(user.id, 'azure');
          azureToken = tokenData?.accessToken;
          if (!azureToken) {
            azureToken = await refreshProviderToken(user.id, 'azure');
          }
        } catch {
          try { azureToken = await refreshProviderToken(user.id, 'azure'); } catch {}
        }

        if (azureToken) {
          const res = await azureFetch(azureToken, `${assistant.vm_id}/start`, { method: 'POST' });
          if (res.ok || res.status === 202) {
            await supabase.from('assistants').update({ status: 'active' }).eq('id', assistant.id);
            results.push({ userId: user.id, action: 'started' });
          } else {
            results.push({ userId: user.id, action: 'start_failed', error: `HTTP ${res.status}` });
          }
        } else {
          results.push({ userId: user.id, action: 'skip', error: 'No Azure token' });
        }
      } else {
        results.push({ userId: user.id, action: 'no_change' });
      }
    } catch (err: any) {
      results.push({ userId: user.id, action: 'error', error: err.message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
