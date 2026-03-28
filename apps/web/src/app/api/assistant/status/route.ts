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
    // Also advance if status is 'active' but provisioning_step isn't done yet
    // (race condition: phone-home set status before wait_vm fetched the IP).
    const needsProvisioning =
      assistant.provider === 'azure' &&
      assistant.provisioning_step &&
      assistant.provisioning_step !== 'done' &&
      (assistant.status === 'provisioning' || assistant.status === 'active');

    if (needsProvisioning) {
      try {
        const updated = await advanceProvisioning(assistant);
        return NextResponse.json({ assistant: updated });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('Provisioning step failed:', errMsg);
        // Store error in provisioning_data for debugging
        try {
          const supabaseUpdate: any = createClient();
          const existingData = assistant.provisioning_data || {};
          await supabaseUpdate
            .from('assistants')
            .update({
              provisioning_data: { ...existingData, lastError: errMsg, lastErrorAt: new Date().toISOString() },
            })
            .eq('id', assistant.id);
        } catch { /* best effort */ }
        // Return current state with error info
        return NextResponse.json({
          assistant: { ...assistant, _provisioningError: errMsg },
        });
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
