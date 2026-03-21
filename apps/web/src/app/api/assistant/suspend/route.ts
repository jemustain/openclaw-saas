import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { suspendAssistant } from '@/lib/vm/lifecycle';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from('assistants')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'No active assistant to suspend' }, { status: 404 });
    }

    const assistant = await suspendAssistant(existing.id);
    return NextResponse.json({ assistant });
  } catch (err) {
    console.error('Suspend failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
