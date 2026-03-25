import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { suspendAssistant, resumeAssistant } from '@/lib/vm/lifecycle';
import { isWithinActiveWindow } from '@/lib/scheduler/free-tier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/scheduler
 *
 * Called every 15 minutes by Vercel Cron (or an external scheduler).
 * Suspends free-tier VMs outside their 8h active window and resumes
 * them when the window opens again.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase: any = await createClient();

  // Fetch all free-tier assistants that have a VM (active or suspended)
  const { data: assistants, error } = await supabase
    .from('assistants')
    .select('id, status, user_id, timezone')
    .in('status', ['active', 'suspended'])
    .eq('tier', 'free');

  if (error) {
    console.error('[scheduler] Failed to query assistants:', error.message);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
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
      console.error(`[scheduler] Error processing ${assistant.id}:`, err.message);
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
