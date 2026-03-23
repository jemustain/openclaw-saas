import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isInWindow, powerOnDroplet, powerOffDroplet } from '@/lib/vm/scheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient();

  // Get all free users with a configured window who completed onboarding
  const { data: users, error: usersError } = await supabase
    .from('users' as never)
    .select('id, timezone, window_start')
    .eq('plan', 'free')
    .not('window_start', 'is', null)
    .eq('onboarding_complete', true) as unknown as {
      data: Array<{ id: string; timezone: string; window_start: number }> | null;
      error: { message: string } | null;
    };

  if (usersError) {
    console.error('Failed to fetch users:', usersError);
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  if (!users || users.length === 0) {
    return Response.json({ message: 'No eligible users', processed: 0 });
  }

  let powered_on = 0;
  let powered_off = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const inWindow = isInWindow(user.window_start, user.timezone);

      // Get DO token
      const { data: tokenRow } = await supabase
        .from('provider_tokens' as never)
        .select('access_token')
        .eq('user_id', user.id)
        .eq('provider', 'digitalocean')
        .single() as unknown as { data: { access_token: string } | null };

      if (!tokenRow) {
        console.warn(`No DO token for user ${user.id}, skipping`);
        skipped++;
        continue;
      }

      // Get assistant/droplet
      const { data: assistant } = await supabase
        .from('assistants' as never)
        .select('id, status, droplet_id')
        .eq('user_id', user.id)
        .single() as unknown as { data: { id: string; status: string; droplet_id: string | null } | null };

      if (!assistant?.droplet_id) {
        console.warn(`No droplet for user ${user.id}, skipping`);
        skipped++;
        continue;
      }

      if (inWindow && assistant.status === 'suspended') {
        // Power on
        await powerOnDroplet(assistant.droplet_id, tokenRow.access_token);
        await supabase
          .from('assistants' as never)
          .update({ status: 'active' } as never)
          .eq('id', assistant.id);
        powered_on++;
        console.log(`Powered ON droplet ${assistant.droplet_id} for user ${user.id}`);
      } else if (!inWindow && assistant.status === 'active') {
        // Power off
        await powerOffDroplet(assistant.droplet_id, tokenRow.access_token);
        await supabase
          .from('assistants' as never)
          .update({ status: 'suspended' } as never)
          .eq('id', assistant.id);
        powered_off++;
        console.log(`Powered OFF droplet ${assistant.droplet_id} for user ${user.id}`);
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Error processing user ${user.id}:`, err);
      errors++;
    }
  }

  return Response.json({
    message: 'VM scheduler complete',
    processed: users.length,
    powered_on,
    powered_off,
    skipped,
    errors,
  });
}
