import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { destroyAssistant } from '@/lib/vm/lifecycle';

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

    if (!existing) {
      return NextResponse.json({ error: 'No assistant to destroy' }, { status: 404 });
    }

    const assistant = await destroyAssistant(existing.id);
    return NextResponse.json({ assistant });
  } catch (err) {
    console.error('Destroy failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
