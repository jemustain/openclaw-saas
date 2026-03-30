import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import {
  setupTelegramForAssistant,
  setupTelegramWithToken,
  setupWhatsAppForAssistant,
} from '@/lib/messaging/setup';
import { NextResponse } from 'next/server';
import { apiError, handleApiError, ERR } from '@/lib/errors';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }

    const body = await request.json();
    const { platform, assistantId, displayName, botToken } = body as {
      platform: string;
      assistantId?: string;
      displayName?: string;
      botToken?: string;
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

    let result;
    switch (platform) {
      case 'telegram':
        if (botToken) {
          result = await setupTelegramWithToken(targetAssistantId!, botToken);
        } else {
          result = await setupTelegramForAssistant(targetAssistantId!, session.userId, displayName);
        }
        break;
      case 'whatsapp':
        result = await setupWhatsAppForAssistant(targetAssistantId!);
        break;
      default:
        return apiError(`Unsupported platform: ${platform}`, 400);
    }

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err, 'messaging/setup');
  }
}
