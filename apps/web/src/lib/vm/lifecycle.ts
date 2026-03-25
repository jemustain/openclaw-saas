import { createClient } from '../supabase/server';
import { createDroplet, destroyDroplet, powerOn, powerOff, validateAccount } from '../providers/digitalocean';
import { createVM, destroyVM, powerOnVM, powerOffVM, validateAccount as validateAzureAccount, ensureResourceGroup, ensureNetworking } from '../providers/azure';
import { OracleProvider } from '../providers/oracle';
import { getProviderToken, refreshProviderToken } from '../providers/token-store';
import { generateCloudInit } from '../providers/cloud-init';
import type { Assistant, AssistantStatus } from '../supabase/types';
import { randomUUID } from 'crypto';

const RG_NAME = 'shiftworker-rg';

/**
 * Parse an Azure resource ID into its components.
 * Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines/{name}
 */
function parseAzureVmId(resourceId: string): { subscriptionId: string; resourceGroup: string; vmName: string } {
  const match = resourceId.match(
    /\/subscriptions\/([^/]+)\/resourceGroups\/([^/]+)\/providers\/Microsoft\.Compute\/virtualMachines\/([^/]+)/i,
  );
  if (match) {
    return { subscriptionId: match[1], resourceGroup: match[2], vmName: match[3] };
  }
  // Fallback: treat as just a VM name (shouldn't happen, but be safe)
  throw new Error(`Cannot parse Azure VM resource ID: ${resourceId}`);
}

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
 * @deprecated Use getUserProviderToken instead
 */
async function getUserDOToken(userId: string): Promise<string> {
  return getUserProviderToken(userId, 'digitalocean');
}

/**
 * Get a shared OracleProvider instance (uses our own OCI credentials).
 */
function getOracleProvider(): OracleProvider {
  return new OracleProvider();
}

/**
 * Determine the cloud provider for a user.
 * Checks user's provider_preference, falls back to CLOUD_PROVIDER env or 'oracle'.
 */
async function getProviderForUser(userId: string): Promise<'oracle' | 'digitalocean' | 'azure'> {
  const supabase: any = createClient();
  const { data } = await supabase
    .from('users')
    .select('provider_preference, hosting, vm_size')
    .eq('id', userId)
    .single();

  const pref = data?.provider_preference ?? data?.hosting;
  if (pref === 'oracle' || pref === 'digitalocean' || pref === 'azure') return pref;
  return (process.env.CLOUD_PROVIDER as 'oracle' | 'digitalocean' | 'azure') ?? 'azure';
}

/**
 * Launch a new assistant VM.
 * Oracle: uses our own OCI credentials (no user tokens needed).
 * Azure/DigitalOcean: uses the user's OAuth token.
 */
export async function launchAssistant(userId: string): Promise<Assistant> {
  const supabase: any = createClient();
  const provider = await getProviderForUser(userId);

  // Read user record to get VM size preference
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('vm_size')
    .eq('id', userId)
    .single();

  if (userError) throw new Error(`Failed to read user: ${userError.message}`);
  const vmSize: string | null = user?.vm_size ?? null;

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
      provider,
      status: 'provisioning' as AssistantStatus,
      sidecar_token: sidecarToken,
    })
    .select()
    .single();

  if (insertError) throw new Error(`Failed to create assistant: ${insertError.message}`);

  try {
    if (provider === 'oracle') {
      const oracle = getOracleProvider();
      const server = await oracle.createServer({
        name: `claw-${assistantId.slice(0, 8)}`,
        cloudInit,
      });

      return await updateAssistantStatus(assistantId, 'provisioning', {
        vm_id: server.id,
        ip_address: server.publicIpv4,
        region: server.region,
      });
    } else if (provider === 'azure') {
      const token = await getUserProviderToken(userId, 'azure');
      const validation = await validateAzureAccount(token);
      if (!validation.ok || !validation.subscriptionId) {
        throw new Error(validation.error ?? 'No active Azure subscription found');
      }
      const subscriptionId = validation.subscriptionId;
      const resourceGroup = await ensureResourceGroup(token, subscriptionId);
      const networking = await ensureNetworking(token, subscriptionId, resourceGroup);
      const vm = await createVM(token, {
        subscriptionId,
        resourceGroup,
        name: `claw-${assistantId.slice(0, 8)}`,
        cloudInit,
        vmSize: vmSize ?? 'Standard_B1s',
      });

      return await updateAssistantStatus(assistantId, 'provisioning', {
        vm_id: vm.id,
        ip_address: vm.publicIpv4,
        region: vm.region,
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
        size: vmSize ?? undefined,
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
  } else if (assistant.provider === 'azure') {
    const token = await getUserProviderToken(assistant.user_id, 'azure');
    const { subscriptionId, resourceGroup, vmName } = parseAzureVmId(assistant.vm_id);
    await powerOffVM(token, subscriptionId, resourceGroup, vmName);
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
  } else if (assistant.provider === 'azure') {
    const token = await getUserProviderToken(assistant.user_id, 'azure');
    const { subscriptionId, resourceGroup, vmName } = parseAzureVmId(assistant.vm_id);
    await powerOnVM(token, subscriptionId, resourceGroup, vmName);
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
      } else if (assistant.provider === 'azure') {
        const token = await getUserProviderToken(assistant.user_id, 'azure');
        const { subscriptionId, resourceGroup, vmName } = parseAzureVmId(assistant.vm_id);
        await destroyVM(token, subscriptionId, resourceGroup, vmName);
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
