import { createClient } from '../supabase/server';
import { createDroplet, destroyDroplet, powerOn, powerOff, validateAccount } from '../providers/digitalocean';
import { OracleProvider } from '../providers/oracle';
import { getProviderToken, refreshProviderToken } from '../providers/token-store';
import { generateCloudInit } from '../providers/cloud-init';
import type { Assistant, AssistantStatus } from '../supabase/types';
import { randomUUID } from 'crypto';

const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shiftworker.ai';

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
  const supabase: any = createClient();
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
 * Get a valid provider access token for the user, refreshing if expired.
 */
async function getUserProviderToken(userId: string, provider: string): Promise<string> {
  const tokenData = await getProviderToken(userId, provider);
  if (!tokenData) throw new Error(`${provider} account not connected. Please connect via Settings.`);

  // Refresh if expired or expiring within 5 minutes
  if (tokenData.expiresAt && tokenData.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    return await refreshProviderToken(userId, provider);
  }

  return tokenData.accessToken;
}

/**
<<<<<<< HEAD
 * @deprecated Use getUserProviderToken instead
 */
async function getUserDOToken(userId: string): Promise<string> {
  return getUserProviderToken(userId, 'digitalocean');
}

/**
 * Launch a new assistant VM on the user's DigitalOcean account.
 */
export async function launchAssistant(userId: string): Promise<Assistant> {
  const supabase: any = createClient();

  // Read user record to determine hosting provider and VM size
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('hosting, vm_size')
    .eq('id', userId)
    .single();

  if (userError) throw new Error(`Failed to read user: ${userError.message}`);

  const hosting: string = user?.hosting ?? 'digitalocean';
  const vmSize: string | null = user?.vm_size ?? null;

  if (hosting === 'oracle') {
    // Oracle uses the free-tier provider — handled separately
    // TODO: integrate with Oracle provider once merged
    throw new Error('Oracle Cloud provisioning is not yet available via this path');
  }

  // For Azure and DigitalOcean, get the provider token
  const token = await getUserProviderToken(userId, hosting);

  if (hosting === 'digitalocean') {
    // Pre-flight: validate the DO account can create resources
    const validation = await validateAccount(token);
    if (!validation.ok) {
      throw new Error(validation.error ?? 'DigitalOcean account validation failed');
    }
  }
=======
 * Determine the cloud provider for a user.
 * Checks user's provider_preference, falls back to CLOUD_PROVIDER env or 'oracle'.
 */
async function getProviderForUser(userId: string): Promise<'oracle' | 'digitalocean'> {
  const supabase: any = createClient();
  const { data } = await supabase
    .from('users')
    .select('provider_preference')
    .eq('id', userId)
    .single();

  const pref = data?.provider_preference;
  if (pref === 'oracle' || pref === 'digitalocean') return pref;
  return (process.env.CLOUD_PROVIDER as 'oracle' | 'digitalocean') ?? 'oracle';
}

/**
 * Get a shared OracleProvider instance (uses our own OCI credentials).
 */
function getOracleProvider(): OracleProvider {
  return new OracleProvider();
}

/**
 * Launch a new assistant VM.
 * Oracle: uses our own OCI credentials (no user tokens needed).
 * DigitalOcean: uses the user's OAuth token.
 */
export async function launchAssistant(userId: string): Promise<Assistant> {
  const supabase: any = createClient();
  const provider = await getProviderForUser(userId);
>>>>>>> origin/main

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
<<<<<<< HEAD
      provider: hosting,
=======
      provider,
>>>>>>> origin/main
      status: 'provisioning' as AssistantStatus,
      sidecar_token: sidecarToken,
    })
    .select()
    .single();

  if (insertError) throw new Error(`Failed to create assistant: ${insertError.message}`);

  try {
<<<<<<< HEAD
    if (hosting === 'azure') {
      // TODO: call Azure createVM with vmSize once azure provider is merged
      throw new Error('Azure VM provisioning not yet implemented');
    }

    // DigitalOcean
    const droplet = await createDroplet(token, {
      name: `claw-${assistantId.slice(0, 8)}`,
      cloudInit,
      size: vmSize ?? undefined,
    });
=======
    if (provider === 'oracle') {
      const oracle = getOracleProvider();
      const server = await oracle.createServer({
        name: `claw-${assistantId.slice(0, 8)}`,
        cloudInit,
      });
>>>>>>> origin/main

      return await updateAssistantStatus(assistantId, 'provisioning', {
        vm_id: server.id,
        ip_address: server.publicIpv4,
        region: server.region,
      });
    } else {
      // DigitalOcean flow — requires user OAuth tokens
      const token = await getUserDOToken(userId);
      const validation = await validateAccount(token);
      if (!validation.ok) {
        throw new Error(validation.error ?? 'DigitalOcean account validation failed');
      }

      const droplet = await createDroplet(token, {
        name: `claw-${assistantId.slice(0, 8)}`,
        cloudInit,
      });

      return await updateAssistantStatus(assistantId, 'provisioning', {
        vm_id: String(droplet.id),
        ip_address: droplet.publicIpv4,
        region: droplet.region,
      });
    }
  } catch (err) {
    await updateAssistantStatus(assistantId, 'destroyed').catch(() => {});
    throw err;
  }
}

/**
 * Suspend (power off) an assistant's VM.
 */
export async function suspendAssistant(assistantId: string): Promise<Assistant> {
  const supabase: any = createClient();
  const { data, error } = await supabase
    .from('assistants')
    .select()
    .eq('id', assistantId)
    .single();

  if (error || !data) throw new Error('Assistant not found');
  const assistant = data as Assistant;

  assertTransition(assistant.status, 'suspended');
  if (!assistant.vm_id) throw new Error('No VM associated with assistant');

  if (assistant.provider === 'oracle') {
    const oracle = getOracleProvider();
    await oracle.powerOff(assistant.vm_id);
  } else {
    const token = await getUserDOToken(assistant.user_id);
    await powerOff(token, Number(assistant.vm_id));
  }

  return await updateAssistantStatus(assistantId, 'suspended');
}

/**
 * Resume (power on) a suspended assistant's VM.
 */
export async function resumeAssistant(assistantId: string): Promise<Assistant> {
  const supabase: any = createClient();
  const { data, error } = await supabase
    .from('assistants')
    .select()
    .eq('id', assistantId)
    .single();

  if (error || !data) throw new Error('Assistant not found');
  const assistant = data as Assistant;

  assertTransition(assistant.status, 'active');
  if (!assistant.vm_id) throw new Error('No VM associated with assistant');

  if (assistant.provider === 'oracle') {
    const oracle = getOracleProvider();
    await oracle.powerOn(assistant.vm_id);
  } else {
    const token = await getUserDOToken(assistant.user_id);
    await powerOn(token, Number(assistant.vm_id));
  }

  return await updateAssistantStatus(assistantId, 'active');
}

/**
 * Destroy an assistant's VM permanently.
 */
export async function destroyAssistant(assistantId: string): Promise<Assistant> {
  const supabase: any = createClient();
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
      if (assistant.provider === 'oracle') {
        const oracle = getOracleProvider();
        await oracle.destroyServer(assistant.vm_id);
      } else {
        const token = await getUserDOToken(assistant.user_id);
        await destroyDroplet(token, Number(assistant.vm_id));
      }
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
