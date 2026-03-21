import { createClient } from '../supabase/server';
import { createDroplet, destroyDroplet, powerOn, powerOff } from '../providers/digitalocean';
import { getProviderToken, refreshProviderToken } from '../providers/token-store';
import { generateCloudInit } from '../providers/cloud-init';
import type { Assistant, AssistantStatus } from '../supabase/types';
import { randomUUID } from 'crypto';

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
 * Get a valid DO access token for the user, refreshing if expired.
 */
async function getUserDOToken(userId: string): Promise<string> {
  const tokenData = await getProviderToken(userId, 'digitalocean');
  if (!tokenData) throw new Error('DigitalOcean account not connected. Please connect via Settings.');

  // Refresh if expired or expiring within 5 minutes
  if (tokenData.expiresAt && tokenData.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    return await refreshProviderToken(userId, 'digitalocean');
  }

  return tokenData.accessToken;
}

/**
 * Launch a new assistant VM on the user's DigitalOcean account.
 */
export async function launchAssistant(userId: string): Promise<Assistant> {
  const supabase: any = await createClient();
  const token = await getUserDOToken(userId);

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
      provider: 'digitalocean',
      status: 'provisioning' as AssistantStatus,
      sidecar_token: sidecarToken,
    })
    .select()
    .single();

  if (insertError) throw new Error(`Failed to create assistant: ${insertError.message}`);

  try {
    const droplet = await createDroplet(token, {
      name: `claw-${assistantId.slice(0, 8)}`,
      cloudInit,
    });

    return await updateAssistantStatus(assistantId, 'provisioning', {
      vm_id: String(droplet.id),
      ip_address: droplet.publicIpv4,
      region: droplet.region,
    });
  } catch (err) {
    await updateAssistantStatus(assistantId, 'destroyed').catch(() => {});
    throw err;
  }
}

/**
 * Suspend (power off) an assistant's droplet.
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

  const token = await getUserDOToken(assistant.user_id);
  await powerOff(token, Number(assistant.vm_id));
  return await updateAssistantStatus(assistantId, 'suspended');
}

/**
 * Resume (power on) a suspended assistant's droplet.
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

  const token = await getUserDOToken(assistant.user_id);
  await powerOn(token, Number(assistant.vm_id));
  return await updateAssistantStatus(assistantId, 'active');
}

/**
 * Destroy an assistant's droplet permanently.
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
      const token = await getUserDOToken(assistant.user_id);
      await destroyDroplet(token, Number(assistant.vm_id));
    }
    return await updateAssistantStatus(assistantId, 'destroyed', {
      vm_id: null,
      ip_address: null,
    });
  } catch (err) {
    return await updateAssistantStatus(assistantId, 'destroyed', {
      vm_id: null,
      ip_address: null,
    });
  }
}
