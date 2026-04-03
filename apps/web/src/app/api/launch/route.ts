import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { launchAssistant, resumeAssistant } from '@/lib/vm/lifecycle';
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
      .select('id, status')
      .eq('user_id', session.userId)
      .neq('status', 'destroyed')
      .limit(1)
      .single();

    if (existing) {
      // If the existing assistant is suspended, resume it instead of blocking
      if (existing.status === 'suspended') {
        const assistant = await resumeAssistant(existing.id);
        return NextResponse.json({ assistant, resumed: true }, { status: 200 });
      }
      return NextResponse.json(
        { error: 'You already have an active assistant.', assistant: existing },
        { status: 409 },
      );
    }

    const assistant = await launchAssistant(session.userId);
    return NextResponse.json({ assistant }, { status: 201 });
  } catch (err) {
    return handleApiError(err, 'launch');
  }
}
