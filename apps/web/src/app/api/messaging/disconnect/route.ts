import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { disconnectMessenger } from '@/lib/messaging/setup';
import { NextResponse } from 'next/server';
import { apiError, handleApiError, ERR } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }

    const body = await request.json();
    const { platform, assistantId } = body as {
      platform: string;
      assistantId?: string;
    };

    if (!platform) {
      return apiError('Platform is required.', 400);
    }

    const supabase: any = createClient();
    let targetAssistantId = assistantId;
    if (!targetAssistantId) {
      const { data: assistant } = await supabase
        .from('assistants')
        .select('id')
        .eq('user_id', session.userId)
        .in('status', ['active', 'provisioning'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!assistant) {
        return apiError(ERR.NO_ACTIVE_ASSISTANT, 404);
      }
      targetAssistantId = assistant.id;
    }

    const result = await disconnectMessenger(targetAssistantId!, platform);

    if (!result.success) {
      return apiError(result.error || 'Failed to disconnect messenger.', 400);
    }

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err, 'messaging/disconnect');
  }
}
