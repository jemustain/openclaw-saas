import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import {
  setupTelegramForAssistant,
  setupWhatsAppForAssistant,
} from '@/lib/messaging/setup';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform, assistantId, displayName } = body as {
      platform: string;
      assistantId?: string;
      displayName?: string;
    };

    if (!platform) {
      return NextResponse.json(
        { error: 'platform is required' },
        { status: 400 },
      );
    }

    // Find the assistant — use provided ID or get the user's active one
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
        return NextResponse.json(
          { error: 'No active assistant found' },
          { status: 404 },
        );
      }
      targetAssistantId = assistant.id;
    }

    let result;
    switch (platform) {
      case 'telegram':
        result = await setupTelegramForAssistant(
          targetAssistantId!,
          session.userId,
          displayName,
        );
        break;
      case 'whatsapp':
        result = await setupWhatsAppForAssistant(targetAssistantId!);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported platform: ${platform}` },
          { status: 400 },
        );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Messaging setup error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
