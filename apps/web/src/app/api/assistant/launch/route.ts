import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { launchAssistant } from '@/lib/vm/lifecycle';
import { apiError, handleApiError, ERR } from '@/lib/errors';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return apiError(ERR.UNAUTHORIZED, 401);
  }

  try {
    // Block launch if user has a suspended assistant
    const supabase: any = createClient();
    const { data: suspended } = await supabase
      .from('assistants')
      .select('id')
      .eq('user_id', session.userId)
      .eq('status', 'suspended')
      .limit(1)
      .single();

    if (suspended) {
      return apiError(
        'You have a suspended assistant. Please resume it instead of launching a new one.',
        409,
      );
    }

    const assistant = await launchAssistant(session.userId);
    return NextResponse.json({ assistant });
  } catch (err) {
    return handleApiError(err, 'assistant/launch');
  }
}
