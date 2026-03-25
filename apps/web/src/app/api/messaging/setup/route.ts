import { createClient } from '@/lib/supabase/server';
import {
  setupTelegramForAssistant,
  setupWhatsAppForAssistant,
} from '@/lib/messaging/setup';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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
    let targetAssistantId = assistantId;
    if (!targetAssistantId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assistant } = await (supabase as any)
        .from('assistants')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['running', 'provisioning'])
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
          user.id,
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
