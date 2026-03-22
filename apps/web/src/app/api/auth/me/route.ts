import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase: any = createClient();
  const { data: user } = await supabase
    .from('users')
    .select('email, name, timezone, plan')
    .eq('id', session.userId)
    .single();

  return NextResponse.json({ user: user ?? { email: session.email, name: session.name } });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, timezone } = body;

  const supabase: any = createClient();
  await supabase
    .from('users')
    .update({ name, timezone, updated_at: new Date().toISOString() })
    .eq('id', session.userId);

  return NextResponse.json({ ok: true });
}
