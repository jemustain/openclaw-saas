import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Assistant } from '@/lib/supabase/types';
import { onAssistantReady } from '@/lib/email/triggers';
import { apiError, ERR, handleApiError } from '@/lib/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> },
) {
  const { instanceId } = await params;

  // Extract Bearer token
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return apiError(ERR.UNAUTHORIZED, 401);
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
    return apiError(ERR.UNAUTHORIZED, 401);
  }

  // Derive caller IP from the request (Vercel sets x-forwarded-for)
  const callerIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null;

  if (record.status !== 'provisioning') {
    // Already active - but backfill ip_address if missing (fixes race condition
    // where phone-home arrived before the wait_vm step fetched the IP).
    if (!record.ip_address && callerIp) {
      await supabase
        .from('assistants')
        .update({
          ip_address: callerIp,
          provisioning_step: 'done',
          updated_at: new Date().toISOString(),
        })
        .eq('id', instanceId);
    }
    return NextResponse.json({ status: record.status });
  }

  // Transition from provisioning -> active, set IP and mark provisioning done.
  // This prevents a race where the frontend poll never runs wait_vm because
  // status is already 'active'.
  const updates: Record<string, any> = {
    status: 'active',
    provisioning_step: 'done',
    updated_at: new Date().toISOString(),
  };
  if (callerIp) {
    updates.ip_address = callerIp;
  }

  const { error: updateError } = await supabase
    .from('assistants')
    .update(updates)
    .eq('id', instanceId);

  if (updateError) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  // Send "assistant ready" email (fire-and-forget)
  onAssistantReady(record.user_id).catch((err) =>
    console.error('[email] Failed to send assistant-ready email:', err),
  );

  return NextResponse.json({ status: 'active' });
}
