import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { timezone, plan, windowStart, messengers, skills, hosting, onboardingComplete } = body;

  const supabase: any = createClient();

  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (timezone !== undefined) update.timezone = timezone;
  if (plan !== undefined) update.plan = plan;
  if (windowStart !== undefined) update.window_start = windowStart;
  if (messengers !== undefined) update.messengers = messengers;
  if (skills !== undefined) update.skills = skills;
  if (onboardingComplete !== undefined) update.onboarding_complete = onboardingComplete;
  if (hosting !== undefined) update.provider_preference = hosting;

  const { error } = await supabase
    .from('users')
    .update(update)
    .eq('id', session.userId);

  if (error) {
    console.error('Onboarding update error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
