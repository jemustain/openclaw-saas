/**
 * Step-based Azure VM provisioning.
 *
 * Each step performs a single Azure API call (PUT or GET) that completes
 * well within Vercel's 10-second function timeout.  The provisioning state
 * is persisted in the assistant record so any invocation can pick up where
 * the previous one left off.
 *
 * Steps:
 *   validate → create_rg → create_nsg → create_vnet → create_ip → create_nic → create_vm → wait_vm → done
 */

import { createClient } from '../supabase/server';
import {
  validateAccount as validateAzureAccount,
} from '../providers/azure';
import { getProviderToken, refreshProviderToken } from '../providers/token-store';
import type { Assistant, ProvisioningStep } from '../supabase/types';

// Re-use constants from azure.ts
const ARM_BASE = 'https://management.azure.com';
const COMPUTE_API = '2024-07-01';
const NETWORK_API = '2024-05-01';
const RESOURCE_API = '2024-07-01';

const DEFAULT_REGION = 'centralus';
const RG_NAME = 'shiftworker-rg';
const VNET_NAME = 'shiftworker-vnet';
const SUBNET_NAME = 'default';
const NSG_NAME = 'shiftworker-nsg';

const DEFAULT_IMAGE = {
  publisher: 'Canonical',
  offer: 'ubuntu-24_04-lts',
  sku: 'server',
  version: 'latest',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function azureFetch(token: string, path: string, init: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${ARM_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Azure API error ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Check if a resource is provisioned. Returns 'Succeeded' | 'Failed' | 'InProgress' | null */
async function checkProvisioningState(
  token: string,
  path: string,
): Promise<string | null> {
  try {
    const data = await azureFetch(token, path);
    return data?.properties?.provisioningState ?? null;
  } catch {
    return null;
  }
}

async function getUserToken(userId: string): Promise<string> {
  const tokenData = await getProviderToken(userId, 'azure');
  if (!tokenData) throw new Error('Azure account not connected');
  if (tokenData.expiresAt && tokenData.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    return await refreshProviderToken(userId, 'azure');
  }
  return tokenData.accessToken;
}

async function updateAssistant(
  assistantId: string,
  updates: Partial<Assistant>,
): Promise<Assistant> {
  const supabase: any = createClient();
  const { data, error } = await supabase
    .from('assistants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', assistantId)
    .select()
    .single();
  if (error) throw new Error(`DB update failed: ${error.message}`);
  return data as Assistant;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Advance an assistant's Azure provisioning by one step.
 * Returns the updated assistant record.
 * Safe to call repeatedly — idempotent per step.
 */
export async function advanceProvisioning(assistant: Assistant): Promise<Assistant> {
  const step = assistant.provisioning_step as ProvisioningStep;
  const pd = (assistant.provisioning_data ?? {}) as Record<string, any>;

  if (!step || step === 'done') return assistant;

  const token = await getUserToken(assistant.user_id);

  switch (step) {
    case 'validate': {
      const validation = await validateAzureAccount(token);
      if (!validation.ok || !validation.subscriptionId) {
        // Mark as failed
        return await updateAssistant(assistant.id, {
          status: 'destroyed',
          provisioning_step: null,
          provisioning_data: null,
        });
      }
      return await updateAssistant(assistant.id, {
        provisioning_step: 'create_rg' as ProvisioningStep,
        provisioning_data: {
          ...pd,
          subscriptionId: validation.subscriptionId,
        } as any,
      });
    }

    case 'create_rg': {
      const { subscriptionId } = pd;
      const path = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}?api-version=${RESOURCE_API}`;

      // Check if RG already exists (from previous provision attempt)
      try {
        const existing = await azureFetch(token, path);
        if (existing?.location) {
          // RG exists - use its existing location for all resources
          return await updateAssistant(assistant.id, {
            provisioning_step: 'create_nsg' as ProvisioningStep,
            provisioning_data: { ...pd, region: existing.location },
          });
        }
      } catch { /* doesn't exist yet, create it */ }

      const region = pd.region ?? DEFAULT_REGION;
      await azureFetch(token, path, {
        method: 'PUT',
        body: JSON.stringify({ location: region }),
      });
      return await updateAssistant(assistant.id, {
        provisioning_step: 'create_nsg' as ProvisioningStep,
        provisioning_data: { ...pd, region },
      });
    }

    case 'create_nsg': {
      const { subscriptionId } = pd;
      const base = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}/providers`;
      const nsgPath = `${base}/Microsoft.Network/networkSecurityGroups/${NSG_NAME}?api-version=${NETWORK_API}`;

      // Check if already provisioned from a previous attempt
      const state = await checkProvisioningState(token, nsgPath);
      if (state === 'Succeeded') {
        return await updateAssistant(assistant.id, {
          provisioning_step: 'create_vnet' as ProvisioningStep,
        });
      }

      await azureFetch(token, nsgPath, {
        method: 'PUT',
        body: JSON.stringify({
          location: pd.region ?? DEFAULT_REGION,
          properties: {
            securityRules: [
              {
                name: 'AllowSSH',
                properties: {
                  priority: 1000, protocol: 'Tcp', access: 'Allow', direction: 'Inbound',
                  sourceAddressPrefix: '*', sourcePortRange: '*',
                  destinationAddressPrefix: '*', destinationPortRange: '22',
                },
              },
              {
                name: 'AllowHTTPS',
                properties: {
                  priority: 1010, protocol: 'Tcp', access: 'Allow', direction: 'Inbound',
                  sourceAddressPrefix: '*', sourcePortRange: '*',
                  destinationAddressPrefix: '*', destinationPortRange: '443',
                },
              },
              {
                name: 'AllowGateway',
                properties: {
                  priority: 1020, protocol: 'Tcp', access: 'Allow', direction: 'Inbound',
                  sourceAddressPrefix: '*', sourcePortRange: '*',
                  destinationAddressPrefix: '*', destinationPortRange: '3000',
                },
              },
            ],
          },
        }),
      });

      // NSG PUT usually returns synchronously or near-instantly, but check
      const postState = await checkProvisioningState(token, nsgPath);
      if (postState === 'Succeeded') {
        return await updateAssistant(assistant.id, {
          provisioning_step: 'create_vnet' as ProvisioningStep,
        });
      }
      // Still creating — stay on this step, next poll will check again
      return assistant;
    }

    case 'create_vnet': {
      const { subscriptionId } = pd;
      const base = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}/providers`;
      const nsgId = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}/providers/Microsoft.Network/networkSecurityGroups/${NSG_NAME}`;
      const vnetPath = `${base}/Microsoft.Network/virtualNetworks/${VNET_NAME}?api-version=${NETWORK_API}`;

      const state = await checkProvisioningState(token, vnetPath);
      if (state === 'Succeeded') {
        return await updateAssistant(assistant.id, {
          provisioning_step: 'create_ip' as ProvisioningStep,
        });
      }

      await azureFetch(token, vnetPath, {
        method: 'PUT',
        body: JSON.stringify({
          location: pd.region ?? DEFAULT_REGION,
          properties: {
            addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
            subnets: [{
              name: SUBNET_NAME,
              properties: {
                addressPrefix: '10.0.0.0/24',
                networkSecurityGroup: { id: nsgId },
              },
            }],
          },
        }),
      });

      const postState = await checkProvisioningState(token, vnetPath);
      if (postState === 'Succeeded') {
        return await updateAssistant(assistant.id, {
          provisioning_step: 'create_ip' as ProvisioningStep,
        });
      }
      return assistant;
    }

    case 'create_ip': {
      const { subscriptionId, vmName } = pd;
      const base = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}/providers`;
      const ipPath = `${base}/Microsoft.Network/publicIPAddresses/${vmName}-ip?api-version=${NETWORK_API}`;

      const state = await checkProvisioningState(token, ipPath);
      if (state === 'Succeeded') {
        return await updateAssistant(assistant.id, {
          provisioning_step: 'create_nic' as ProvisioningStep,
        });
      }

      await azureFetch(token, ipPath, {
        method: 'PUT',
        body: JSON.stringify({
          location: pd.region ?? DEFAULT_REGION,
          properties: { publicIPAllocationMethod: 'Static' },
          sku: { name: 'Standard' },
        }),
      });

      const postState = await checkProvisioningState(token, ipPath);
      if (postState === 'Succeeded') {
        return await updateAssistant(assistant.id, {
          provisioning_step: 'create_nic' as ProvisioningStep,
        });
      }
      return assistant;
    }

    case 'create_nic': {
      const { subscriptionId, vmName } = pd;
      const base = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}/providers`;
      const subnetId = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}/providers/Microsoft.Network/virtualNetworks/${VNET_NAME}/subnets/${SUBNET_NAME}`;
      const nsgId = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}/providers/Microsoft.Network/networkSecurityGroups/${NSG_NAME}`;
      const ipId = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}/providers/Microsoft.Network/publicIPAddresses/${vmName}-ip`;
      const nicPath = `${base}/Microsoft.Network/networkInterfaces/${vmName}-nic?api-version=${NETWORK_API}`;

      const state = await checkProvisioningState(token, nicPath);
      if (state === 'Succeeded') {
        return await updateAssistant(assistant.id, {
          provisioning_step: 'create_vm' as ProvisioningStep,
        });
      }

      await azureFetch(token, nicPath, {
        method: 'PUT',
        body: JSON.stringify({
          location: pd.region ?? DEFAULT_REGION,
          properties: {
            ipConfigurations: [{
              name: 'primary',
              properties: {
                subnet: { id: subnetId },
                publicIPAddress: { id: ipId },
                primary: true,
              },
            }],
            networkSecurityGroup: { id: nsgId },
          },
        }),
      });

      const postState = await checkProvisioningState(token, nicPath);
      if (postState === 'Succeeded') {
        return await updateAssistant(assistant.id, {
          provisioning_step: 'create_vm' as ProvisioningStep,
        });
      }
      return assistant;
    }

    case 'create_vm': {
      const { subscriptionId, vmName, vmSize, cloudInit } = pd;
      const base = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}/providers`;
      const nicId = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}/providers/Microsoft.Network/networkInterfaces/${vmName}-nic`;
      const vmPath = `${base}/Microsoft.Compute/virtualMachines/${vmName}?api-version=${COMPUTE_API}`;

      // Check if already exists
      const state = await checkProvisioningState(token, vmPath);
      if (state === 'Succeeded') {
        return await updateAssistant(assistant.id, {
          provisioning_step: 'wait_vm' as ProvisioningStep,
        });
      }

      // Generate SSH key
      const crypto = await import('crypto');
      const { publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      const pubKeyBase64 = publicKey
        .replace('-----BEGIN RSA PUBLIC KEY-----', '')
        .replace('-----END RSA PUBLIC KEY-----', '')
        .replace(/\n/g, '');
      const sshPublicKey = `ssh-rsa ${pubKeyBase64} shiftworker@azure`;

      const vmBody = {
        location: pd.region ?? DEFAULT_REGION,
        properties: {
          hardwareProfile: { vmSize: vmSize ?? 'Standard_D2as_v5' },
          storageProfile: {
            imageReference: DEFAULT_IMAGE,
            osDisk: {
              createOption: 'FromImage',
              managedDisk: { storageAccountType: 'Standard_LRS' },
            },
          },
          osProfile: {
            computerName: vmName,
            adminUsername: 'azureuser',
            linuxConfiguration: {
              disablePasswordAuthentication: true,
              ssh: {
                publicKeys: [{
                  path: '/home/azureuser/.ssh/authorized_keys',
                  keyData: sshPublicKey,
                }],
              },
            },
            ...(cloudInit ? { customData: Buffer.from(cloudInit).toString('base64') } : {}),
          },
          networkProfile: {
            networkInterfaces: [{ id: nicId, properties: { primary: true } }],
          },
        },
      };

      await azureFetch(token, vmPath, {
        method: 'PUT',
        body: JSON.stringify(vmBody),
      });

      return await updateAssistant(assistant.id, {
        provisioning_step: 'wait_vm' as ProvisioningStep,
      });
    }

    case 'wait_vm': {
      const { subscriptionId, vmName } = pd;
      const base = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}/providers`;
      const vmPath = `${base}/Microsoft.Compute/virtualMachines/${vmName}?api-version=${COMPUTE_API}`;

      const state = await checkProvisioningState(token, vmPath);
      if (state === 'Failed') {
        return await updateAssistant(assistant.id, {
          status: 'destroyed',
          provisioning_step: null,
          provisioning_data: null,
        });
      }
      if (state !== 'Succeeded') {
        // Still provisioning — wait for next poll
        return assistant;
      }

      // VM is ready — get its info
      const vmData = await azureFetch(token, vmPath);
      const vmId = vmData?.id as string;

      // Get public IP
      let publicIpv4: string | null = null;
      try {
        const ipData = await azureFetch(
          token,
          `${base}/Microsoft.Network/publicIPAddresses/${vmName}-ip?api-version=${NETWORK_API}`,
        );
        publicIpv4 = ipData?.properties?.ipAddress ?? null;
      } catch { /* ok */ }

      return await updateAssistant(assistant.id, {
        status: 'provisioning', // still provisioning until sidecar checks in
        provisioning_step: 'done' as ProvisioningStep,
        provisioning_data: null,
        vm_id: vmId,
        ip_address: publicIpv4,
        region: pd.region ?? DEFAULT_REGION,
      });
    }

    default:
      return assistant;
  }
}
