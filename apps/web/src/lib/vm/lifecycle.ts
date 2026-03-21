import { createClient } from '../supabase/server';
import { HetznerProvider } from '../providers/hetzner';
import { generateCloudInit } from '../providers/cloud-init';
import type { Assistant, AssistantStatus } from '../supabase/types';
import { randomUUID } from 'crypto';

const hetzner = new HetznerProvider();

const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.claw4all.com';

/**
 * Valid state transitions for the assistant lifecycle.
 */
const VALID_TRANSITIONS: Record<AssistantStatus, AssistantStatus[]> = {
  provisioning: ['active', 'destroying', 'destroyed'],
  active: ['suspended', 'destroying'],
  suspended: ['active', 'destroying'],
  destroying: ['destroyed'],
  destroyed: [],
};

function assertTransition(current: AssistantStatus, next: AssistantStatus) {
  if (!VALID_TRANSITIONS[current]?.includes(next)) {
    throw new Error(`Invalid state transition: ${current} → ${next}`);
  }
}

async function updateAssistantStatus(
  assistantId: string,
  status: AssistantStatus,
  extra: Partial<Assistant> = {},
): Promise<Assistant> {
  const supabase: any = await createClient();
  const updatePayload: Partial<Assistant> = { status, ...extra, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('assistants')
    .update(updatePayload)
    .eq('id', assistantId)
    .select()
    .single();

  if (error) throw new Error(`DB update failed: ${error.message}`);
  return data as Assistant;
}

/**
 * Launch a new assistant VM for the given user.
 */
export async function launchAssistant(userId: string): Promise<Assistant> {
  const supabase: any = await createClient();

  const assistantId = randomUUID();
  const sidecarToken = randomUUID();

  const cloudInit = generateCloudInit({
    sidecarToken,
    portalUrl: PORTAL_URL,
    instanceId: assistantId,
  });

  // Insert assistant record as provisioning
  const { data: assistant, error: insertError } = await supabase
    .from('assistants')
    .insert({
      id: assistantId,
      user_id: userId,
      provider: 'hetzner',
      status: 'provisioning' as AssistantStatus,
      sidecar_token: sidecarToken,
    })
    .select()
    .single();

  if (insertError) throw new Error(`Failed to create assistant: ${insertError.message}`);

  try {
    const server = await hetzner.createServer({
      name: `claw-${assistantId.slice(0, 8)}`,
      cloudInit,
      labels: { managed_by: 'claw4all', assistant_id: assistantId },
    });

    // Update with VM info
    return await updateAssistantStatus(assistantId, 'provisioning', {
      vm_id: server.id,
      ip_address: server.publicIpv4,
      region: server.region,
    });
  } catch (err) {
    // Mark destroyed on failure
    await updateAssistantStatus(assistantId, 'destroyed').catch(() => {});
    throw err;
  }
}

/**
 * Suspend (power off) an assistant's VM.
 */
export async function suspendAssistant(assistantId: string): Promise<Assistant> {
  const supabase: any = await createClient();
  const { data, error } = await supabase
    .from('assistants')
    .select()
    .eq('id', assistantId)
    .single();

  if (error || !data) throw new Error('Assistant not found');
  const assistant = data as Assistant;

  assertTransition(assistant.status, 'suspended');
  if (!assistant.vm_id) throw new Error('No VM associated with assistant');

  await hetzner.powerOff(assistant.vm_id);
  return await updateAssistantStatus(assistantId, 'suspended');
}

/**
 * Resume (power on) a suspended assistant's VM.
 */
export async function resumeAssistant(assistantId: string): Promise<Assistant> {
  const supabase: any = await createClient();
  const { data, error } = await supabase
    .from('assistants')
    .select()
    .eq('id', assistantId)
    .single();

  if (error || !data) throw new Error('Assistant not found');
  const assistant = data as Assistant;

  assertTransition(assistant.status, 'active');
  if (!assistant.vm_id) throw new Error('No VM associated with assistant');

  await hetzner.powerOn(assistant.vm_id);
  return await updateAssistantStatus(assistantId, 'active');
}

/**
 * Destroy an assistant's VM permanently.
 */
export async function destroyAssistant(assistantId: string): Promise<Assistant> {
  const supabase: any = await createClient();
  const { data, error } = await supabase
    .from('assistants')
    .select()
    .eq('id', assistantId)
    .single();

  if (error || !data) throw new Error('Assistant not found');
  const assistant = data as Assistant;

  assertTransition(assistant.status, 'destroying');
  await updateAssistantStatus(assistantId, 'destroying');

  try {
    if (assistant.vm_id) {
      await hetzner.destroyServer(assistant.vm_id);
    }
    return await updateAssistantStatus(assistantId, 'destroyed', {
      vm_id: null,
      ip_address: null,
    });
  } catch (err) {
    // Still mark destroyed — VM may already be gone
    return await updateAssistantStatus(assistantId, 'destroyed', {
      vm_id: null,
      ip_address: null,
    });
  }
}
