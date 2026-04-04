import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { resumeAssistant } from '@/lib/vm/lifecycle';
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
      .eq('status', 'suspended')
      .limit(1)
      .single();

    if (!existing) {
      return apiError('No suspended assistant to resume.', 404);
    }

    const assistant = await resumeAssistant(existing.id);
    return NextResponse.json({ assistant });
  } catch (err) {
    return handleApiError(err, 'assistant/resume');
  }
}
