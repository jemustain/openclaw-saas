import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { advanceProvisioning } from '@/lib/vm/provisioning-steps';

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

    // If the assistant is mid-provisioning on Azure, advance one step.
    // Each step is a single API call that fits within the 10s timeout.
    if (
      assistant.status === 'provisioning' &&
      assistant.provider === 'azure' &&
      assistant.provisioning_step &&
      assistant.provisioning_step !== 'done'
    ) {
      try {
        const updated = await advanceProvisioning(assistant);
        return NextResponse.json({ assistant: updated });
      } catch (err) {
        console.error('Provisioning step failed:', err);
        // Return current state — next poll will retry
        return NextResponse.json({ assistant });
      }
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
