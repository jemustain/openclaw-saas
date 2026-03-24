import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { launchAssistant } from '@/lib/vm/lifecycle';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const assistant = await launchAssistant(session.userId);
    return NextResponse.json({ assistant });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to launch assistant' },
      { status: 500 },
    );
  }
}
