import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { launchAssistant } from '@/lib/vm/lifecycle';

export async function POST() {
  const supabase: any = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const assistant = await launchAssistant(user.id);
    return NextResponse.json({ assistant });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to launch assistant' },
      { status: 500 },
    );
  }
}
