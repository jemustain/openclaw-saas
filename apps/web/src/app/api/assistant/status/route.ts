import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase: any = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: assistant, error } = await supabase
      .from('assistants')
      .select()
      .eq('user_id', user.id)
      .neq('status', 'destroyed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as any;

    if (error || !assistant) {
      return NextResponse.json({ assistant: null });
    }

    return NextResponse.json({ assistant });
  } catch (err) {
    console.error('Status check failed:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
