import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Assistant } from '@/lib/supabase/types';
import { onAssistantReady } from '@/lib/email/triggers';
import { onAssistantReady } from '@/lib/email/triggers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> },
) {
  const { instanceId } = await params;

  // Extract Bearer token
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sidecarToken = authHeader.slice(7);

  const supabase: any = await createClient();

  // Find the assistant and verify the sidecar token
  const { data: assistant, error } = await supabase
    .from('assistants')
    .select()
    .eq('id', instanceId)
    .single();

  if (error || !assistant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const record = assistant as Assistant;

  if (record.sidecar_token !== sidecarToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (record.status !== 'provisioning') {
    // Already active or in another state — just acknowledge
    return NextResponse.json({ status: record.status });
  }

  // Transition from provisioning → active
  const { error: updateError } = await supabase
    .from('assistants')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', instanceId);

  if (updateError) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  // Send "assistant ready" email (fire-and-forget)
  onAssistantReady(record.user_id).catch((err) =>
    console.error('[email] Failed to send assistant-ready email:', err),
  );

  // Send "assistant ready" email (fire-and-forget)
  onAssistantReady(record.user_id).catch((err) =>
    console.error('[email] Failed to send assistant-ready email:', err),
  );

  return NextResponse.json({ status: 'active' });
}
