import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { launchAssistant } from '@/lib/vm/lifecycle';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase: any = createClient();
    const { data: existing } = await supabase
      .from('assistants')
      .select('id')
      .eq('user_id', session.userId)
      .neq('status', 'destroyed')
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an active assistant', assistant: existing },
        { status: 409 },
      );
    }

    const assistant = await launchAssistant(session.userId);
    return NextResponse.json({ assistant }, { status: 201 });
  } catch (err) {
    console.error('Launch failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
