import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { launchAssistant } from '@/lib/vm/lifecycle';
import { apiError, handleApiError, ERR } from '@/lib/errors';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return apiError(ERR.UNAUTHORIZED, 401);
  }

  try {
    const assistant = await launchAssistant(session.userId);
    return NextResponse.json({ assistant });
  } catch (err) {
    return handleApiError(err, 'assistant/launch');
  }
}
