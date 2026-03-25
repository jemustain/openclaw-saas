import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase: any = createClient();
    const { data: assistant, error } = await supabase
      .from('assistants')
      .select()
      .eq('user_id', session.userId)
      .neq('status', 'destroyed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

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
