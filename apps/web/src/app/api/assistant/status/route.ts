import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { advanceProvisioning } from '@/lib/vm/provisioning-steps';
import { apiError, handleApiError, ERR } from '@/lib/errors';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
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
        console.error('[assistant/status] Provisioning step failed:', err);
        try {
          const supabaseUpdate: any = createClient();
          const existingData = assistant.provisioning_data || {};
          const errMsg = err instanceof Error ? err.message : String(err);
          await supabaseUpdate
            .from('assistants')
            .update({
              provisioning_data: { ...existingData, lastError: errMsg, lastErrorAt: new Date().toISOString() },
            })
            .eq('id', assistant.id);
        } catch { /* best effort */ }
        return NextResponse.json({
          assistant: { ...assistant, _provisioningError: 'Provisioning step failed. Retrying automatically.' },
        });
      }
    }

    return NextResponse.json({ assistant });
  } catch (err) {
    return handleApiError(err, 'assistant/status');
  }
}
