import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { launchAssistant } from '@/lib/vm/lifecycle';

export async function POST() {
  try {
    const supabase: any = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from('assistants')
      .select('id')
      .eq('user_id', user.id)
      .neq('status', 'destroyed')
      .limit(1)
      .single() as any;

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an active assistant', assistant: existing },
        { status: 409 },
      );
    }

    const assistant = await launchAssistant(user.id);
    return NextResponse.json({ assistant }, { status: 201 });
  } catch (err) {
    console.error('Launch failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
