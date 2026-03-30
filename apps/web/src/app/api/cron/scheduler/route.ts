import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { suspendAssistant, resumeAssistant } from '@/lib/vm/lifecycle';
import { isWithinActiveWindow } from '@/lib/scheduler/free-tier';
import { apiError, ERR } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError(ERR.UNAUTHORIZED, 401);
  }

  const supabase: any = await createClient();

  const { data: assistants, error } = await supabase
    .from('assistants')
    .select('id, status, user_id, timezone')
    .in('status', ['active', 'suspended'])
    .eq('tier', 'free');

  if (error) {
    console.error('[cron/scheduler] Failed to query assistants:', error.message);
    return apiError('Database query failed.', 500);
  }

  const results: { id: string; action: string }[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const assistant of assistants ?? []) {
    const timezone = assistant.timezone ?? 'America/New_York';
    const withinWindow = isWithinActiveWindow(timezone);

    try {
      if (!withinWindow && assistant.status === 'active') {
        await suspendAssistant(assistant.id);
        results.push({ id: assistant.id, action: 'suspended' });
      } else if (withinWindow && assistant.status === 'suspended') {
        await resumeAssistant(assistant.id);
        results.push({ id: assistant.id, action: 'resumed' });
      }
    } catch (err: any) {
      console.error(`[cron/scheduler] Error processing ${assistant.id}:`, err.message);
      errors.push({ id: assistant.id, error: err.message });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: (assistants ?? []).length,
    actions: results,
    errors,
    timestamp: new Date().toISOString(),
  });
}
