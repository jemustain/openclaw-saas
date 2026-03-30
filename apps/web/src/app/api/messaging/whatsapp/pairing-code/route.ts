import { getSession } from '@/lib/auth/session';
import { requestWhatsAppPairingCode } from '@/lib/messaging/setup';
import { NextResponse } from 'next/server';
import { apiError, handleApiError, ERR } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }

    const body = await request.json();
    const { phoneNumber, assistantId } = body as {
      phoneNumber: string;
      assistantId?: string;
    };

    if (!phoneNumber) {
      return apiError('Phone number is required.', 400);
    }

    const cleaned = phoneNumber.replace(/[\s\-()]/g, '');
    if (!/^\+?\d{7,15}$/.test(cleaned)) {
      return apiError('Invalid phone number. Include country code (e.g. +1234567890).', 400);
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

    const result = await requestWhatsAppPairingCode(targetAssistantId!, cleaned);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err, 'messaging/whatsapp/pairing-code');
  }
}
