import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { suspendAssistant } from '@/lib/vm/lifecycle';
import { apiError, handleApiError, ERR } from '@/lib/errors';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }

    const supabase: any = createClient();
    const { data: existing } = await supabase
      .from('assistants')
      .select('id')
      .eq('user_id', session.userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!existing) {
      return apiError('No active assistant to suspend.', 404);
    }

    const assistant = await suspendAssistant(existing.id);
    return NextResponse.json({ assistant });
  } catch (err) {
    return handleApiError(err, 'assistant/suspend');
  }
}
