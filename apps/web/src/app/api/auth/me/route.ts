import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { apiError, ERR } from '@/lib/errors';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return apiError(ERR.UNAUTHORIZED, 401);
  }

  const supabase: any = createClient();
  const { data: user } = await supabase
    .from('users')
    .select('email, name, timezone, plan, ai_provider, ai_api_key')
    .eq('id', session.userId)
    .single();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end')
    .eq('user_id', session.userId)
    .single();

  const maskedKey = user?.ai_api_key
    ? user.ai_api_key.length > 8
      ? user.ai_api_key.slice(0, 4) + '••••••••' + user.ai_api_key.slice(-4)
      : '••••••••'
    : null;

  return NextResponse.json({
    user: {
      ...(user ?? { email: session.email, name: session.name }),
      ai_provider: user?.ai_provider ?? null,
      ai_api_key: maskedKey,
      subscription: subscription ?? null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return apiError(ERR.UNAUTHORIZED, 401);
  }

  const body = await request.json();
  const { name, timezone, ai_provider, ai_api_key } = body;

  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (name !== undefined) update.name = name;
  if (timezone !== undefined) update.timezone = timezone;
  if (ai_provider !== undefined) update.ai_provider = ai_provider;
  if (ai_api_key !== undefined) update.ai_api_key = ai_api_key;

  const supabase: any = createClient();
  await supabase
    .from('users')
    .update(update)
    .eq('id', session.userId);

  return NextResponse.json({ ok: true });
}
