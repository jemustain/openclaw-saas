const ARM_BASE = 'https://management.azure.com';
const COMPUTE_API = '2024-07-01';
const NETWORK_API = '2024-05-01';
const RESOURCE_API = '2024-07-01';

const DEFAULT_REGION = 'westus3';
const DEFAULT_VM_SIZE = 'Standard_B1ms';
const DEFAULT_IMAGE = {
  publisher: 'Canonical',
  offer: 'ubuntu-24_04-lts',
  sku: 'server',
  version: 'latest',
};
const RG_NAME = 'shiftworker-rg';
const VNET_NAME = 'shiftworker-vnet';
const SUBNET_NAME = 'default';
const NSG_NAME = 'shiftworker-nsg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AzureVMOptions {
  subscriptionId: string;
  resourceGroup: string;
  name: string;
  region?: string;
  vmSize?: string;
  cloudInit?: string;
  image?: { publisher: string; offer: string; sku: string; version: string };
}

export interface AzureVMInfo {
  id: string;
  name: string;
  status: string;
  publicIpv4: string | null;
  region: string;
  vmSize: string;
}

// ---------------------------------------------------------------------------
// Fetch helper
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
    const friendly = parseFriendlyError(res.status, body);
    throw new Error(friendly ?? `Azure API error ${res.status}: ${body}`);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function parseFriendlyError(status: number, body: string): string | null {
  try {
    const parsed = JSON.parse(body);
    const code = parsed.error?.code ?? '';
    const msg = parsed.error?.message ?? '';

    if (code === 'QuotaExceeded' || msg.includes('quota')) {
      return 'Azure VM quota exceeded for this region. Try a different region or request a quota increase in the Azure portal.';
    }
    if (code === 'LocationNotAvailableForResourceType') {
      return 'The selected VM size is not available in this region. Try a different region or VM size.';
    }
    if (status === 401 || status === 403) {
      return 'Azure authorization failed. Please re-connect your Azure account.';
    }
    if (code === 'SubscriptionNotFound') {
      return 'Azure subscription not found. Make sure you have an active subscription.';
    }
    if (msg) return `Azure error: ${msg}`;
  } catch {
    // not JSON
  }
  return null;
}

// ---------------------------------------------------------------------------
// Wait for async operations
// ---------------------------------------------------------------------------

async function waitForProvision(token: string, path: string, timeoutMs = 300_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const data = await azureFetch(token, path);
    const state = data?.properties?.provisioningState;
    if (state === 'Succeeded') return data;
    if (state === 'Failed') throw new Error(`Azure provisioning failed for ${path}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Timed out waiting for ${path}`);
}

// ---------------------------------------------------------------------------
// Resource setup
// ---------------------------------------------------------------------------

export async function ensureResourceGroup(
  token: string,
  subscriptionId: string,
  region?: string,
): Promise<string> {
  const loc = region ?? DEFAULT_REGION;
  const path = `/subscriptions/${subscriptionId}/resourceGroups/${RG_NAME}?api-version=${RESOURCE_API}`;
  await azureFetch(token, path, {
    method: 'PUT',
    body: JSON.stringify({ location: loc }),
  });
  return RG_NAME;
}

export async function ensureNetworking(
  token: string,
  subscriptionId: string,
  resourceGroup: string,
  region?: string,
): Promise<{ subnetId: string; nsgId: string }> {
  const loc = region ?? DEFAULT_REGION;
  const base = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers`;

  // 1. NSG with rules for SSH, HTTPS, OpenClaw gateway
  const nsgPath = `${base}/Microsoft.Network/networkSecurityGroups/${NSG_NAME}?api-version=${NETWORK_API}`;
  await azureFetch(token, nsgPath, {
    method: 'PUT',
    body: JSON.stringify({
      location: loc,
      properties: {
        securityRules: [
          {
            name: 'AllowSSH',
            properties: {
              priority: 1000,
              protocol: 'Tcp',
              access: 'Allow',
              direction: 'Inbound',
              sourceAddressPrefix: '*',
              sourcePortRange: '*',
              destinationAddressPrefix: '*',
              destinationPortRange: '22',
            },
          },
          {
            name: 'AllowHTTPS',
            properties: {
              priority: 1010,
              protocol: 'Tcp',
              access: 'Allow',
              direction: 'Inbound',
              sourceAddressPrefix: '*',
              sourcePortRange: '*',
              destinationAddressPrefix: '*',
              destinationPortRange: '443',
            },
          },
          {
            name: 'AllowGateway',
            properties: {
              priority: 1020,
              protocol: 'Tcp',
              access: 'Allow',
              direction: 'Inbound',
              sourceAddressPrefix: '*',
              sourcePortRange: '*',
              destinationAddressPrefix: '*',
              destinationPortRange: '3000',
            },
          },
        ],
      },
    }),
  });
  await waitForProvision(token, nsgPath.replace(`?api-version=${NETWORK_API}`, `?api-version=${NETWORK_API}`));

  // 2. VNet + subnet
  const nsgId = `${ARM_BASE.replace('https://management.azure.com', '')}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Network/networkSecurityGroups/${NSG_NAME}`;
  const actualNsgId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Network/networkSecurityGroups/${NSG_NAME}`;

  const vnetPath = `${base}/Microsoft.Network/virtualNetworks/${VNET_NAME}?api-version=${NETWORK_API}`;
  await azureFetch(token, vnetPath, {
    method: 'PUT',
    body: JSON.stringify({
      location: loc,
      properties: {
        addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
        subnets: [
          {
            name: SUBNET_NAME,
            properties: {
              addressPrefix: '10.0.0.0/24',
              networkSecurityGroup: { id: actualNsgId },
            },
          },
        ],
      },
    }),
  });
  const vnet = await waitForProvision(token, vnetPath.split('?')[0] + `?api-version=${NETWORK_API}`);

  const subnetId = vnet.properties.subnets[0].id as string;
  return { subnetId, nsgId: actualNsgId };
}

// ---------------------------------------------------------------------------
// VM lifecycle
// ---------------------------------------------------------------------------

export async function createVM(token: string, options: AzureVMOptions): Promise<AzureVMInfo> {
  const region = options.region ?? DEFAULT_REGION;
  const vmSize = options.vmSize ?? DEFAULT_VM_SIZE;
  const image = options.image ?? DEFAULT_IMAGE;
  const { subscriptionId, resourceGroup, name } = options;
  const base = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers`;

  // 1. Public IP
  const ipPath = `${base}/Microsoft.Network/publicIPAddresses/${name}-ip?api-version=${NETWORK_API}`;
  await azureFetch(token, ipPath, {
    method: 'PUT',
    body: JSON.stringify({
      location: region,
      properties: { publicIPAllocationMethod: 'Static' },
      sku: { name: 'Standard' },
    }),
  });
  await waitForProvision(token, ipPath);

  // 2. Get subnet + NSG IDs
  const subnetId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Network/virtualNetworks/${VNET_NAME}/subnets/${SUBNET_NAME}`;
  const nsgId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Network/networkSecurityGroups/${NSG_NAME}`;
  const ipId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Network/publicIPAddresses/${name}-ip`;

  // 3. NIC
  const nicPath = `${base}/Microsoft.Network/networkInterfaces/${name}-nic?api-version=${NETWORK_API}`;
  await azureFetch(token, nicPath, {
    method: 'PUT',
    body: JSON.stringify({
      location: region,
      properties: {
        ipConfigurations: [
          {
            name: 'primary',
            properties: {
              subnet: { id: subnetId },
              publicIPAddress: { id: ipId },
              primary: true,
            },
          },
        ],
        networkSecurityGroup: { id: nsgId },
      },
    }),
  });
  await waitForProvision(token, nicPath);

  const nicId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Network/networkInterfaces/${name}-nic`;

  // 4. Generate SSH key pair for the VM
  const crypto = await import('crypto');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Convert PEM public key to SSH format
  const pubKeyBase64 = publicKey
    .replace('-----BEGIN RSA PUBLIC KEY-----', '')
    .replace('-----END RSA PUBLIC KEY-----', '')
    .replace(/\n/g, '');

  // For Azure, we use the PEM format directly — Azure accepts it
  const sshPublicKey = `ssh-rsa ${pubKeyBase64} shiftworker@azure`;

  // 5. Create VM
  const vmPath = `${base}/Microsoft.Compute/virtualMachines/${name}?api-version=${COMPUTE_API}`;
  const vmBody: Record<string, any> = {
    location: region,
    properties: {
      hardwareProfile: { vmSize },
      storageProfile: {
        imageReference: {
          publisher: image.publisher,
          offer: image.offer,
          sku: image.sku,
          version: image.version,
        },
        osDisk: {
          createOption: 'FromImage',
          managedDisk: { storageAccountType: 'Standard_LRS' },
        },
      },
      osProfile: {
        computerName: name,
        adminUsername: 'azureuser',
        linuxConfiguration: {
          disablePasswordAuthentication: true,
          ssh: {
            publicKeys: [
              {
                path: '/home/azureuser/.ssh/authorized_keys',
                keyData: sshPublicKey,
              },
            ],
          },
        },
        ...(options.cloudInit
          ? { customData: Buffer.from(options.cloudInit).toString('base64') }
          : {}),
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
  await waitForProvision(token, vmPath);

  return getVM(token, subscriptionId, resourceGroup, name);
}

export async function destroyVM(
  token: string,
  subscriptionId: string,
  resourceGroup: string,
  vmName: string,
): Promise<void> {
  const base = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers`;

  // Delete VM first
  await azureFetch(token, `${base}/Microsoft.Compute/virtualMachines/${vmName}?api-version=${COMPUTE_API}`, {
    method: 'DELETE',
  });
  // Wait for VM deletion
  await pollDeletion(token, `${base}/Microsoft.Compute/virtualMachines/${vmName}?api-version=${COMPUTE_API}`);

  // Delete NIC
  await azureFetch(token, `${base}/Microsoft.Network/networkInterfaces/${vmName}-nic?api-version=${NETWORK_API}`, {
    method: 'DELETE',
  }).catch(() => {}); // May already be gone
  await pollDeletion(token, `${base}/Microsoft.Network/networkInterfaces/${vmName}-nic?api-version=${NETWORK_API}`);

  // Delete public IP
  await azureFetch(token, `${base}/Microsoft.Network/publicIPAddresses/${vmName}-ip?api-version=${NETWORK_API}`, {
    method: 'DELETE',
  }).catch(() => {});
}

async function pollDeletion(token: string, path: string, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${ARM_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) return;
    } catch {
      return;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

export async function getVM(
  token: string,
  subscriptionId: string,
  resourceGroup: string,
  vmName: string,
): Promise<AzureVMInfo> {
  const base = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers`;

  // Get VM with instance view for power state
  const vm = await azureFetch(
    token,
    `${base}/Microsoft.Compute/virtualMachines/${vmName}?$expand=instanceView&api-version=${COMPUTE_API}`,
  );

  // Get public IP
  let publicIpv4: string | null = null;
  try {
    const ipData = await azureFetch(
      token,
      `${base}/Microsoft.Network/publicIPAddresses/${vmName}-ip?api-version=${NETWORK_API}`,
    );
    publicIpv4 = ipData?.properties?.ipAddress ?? null;
  } catch {
    // IP may not exist yet
  }

  return {
    id: vm.id,
    name: vm.name,
    status: mapVMStatus(vm),
    publicIpv4,
    region: vm.location,
    vmSize: vm.properties.hardwareProfile.vmSize,
  };
}

export async function listVMs(
  token: string,
  subscriptionId: string,
  resourceGroup: string,
): Promise<AzureVMInfo[]> {
  const base = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers`;
  const data = await azureFetch(
    token,
    `${base}/Microsoft.Compute/virtualMachines?api-version=${COMPUTE_API}`,
  );

  const vms: AzureVMInfo[] = [];
  for (const vm of data.value ?? []) {
    // Fetch full VM with instance view for accurate status
    try {
      const info = await getVM(token, subscriptionId, resourceGroup, vm.name);
      vms.push(info);
    } catch {
      vms.push({
        id: vm.id,
        name: vm.name,
        status: vm.properties?.provisioningState ?? 'unknown',
        publicIpv4: null,
        region: vm.location,
        vmSize: vm.properties?.hardwareProfile?.vmSize ?? 'unknown',
      });
    }
  }
  return vms;
}

export async function powerOnVM(
  token: string,
  subscriptionId: string,
  resourceGroup: string,
  vmName: string,
): Promise<void> {
  const path = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines/${vmName}/start?api-version=${COMPUTE_API}`;
  await azureFetch(token, path, { method: 'POST' });
}

export async function powerOffVM(
  token: string,
  subscriptionId: string,
  resourceGroup: string,
  vmName: string,
): Promise<void> {
  const path = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines/${vmName}/deallocate?api-version=${COMPUTE_API}`;
  await azureFetch(token, path, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Account validation
// ---------------------------------------------------------------------------

export async function validateAccount(
  token: string,
): Promise<{ ok: boolean; subscriptionId?: string; error?: string }> {
  try {
    const subs = await listSubscriptions(token);
    const active = subs.find((s) => s.state === 'Enabled');
    if (!active) {
      return { ok: false, error: 'No active Azure subscription found. Please ensure you have an enabled subscription.' };
    }

    // Ensure required resource providers are registered
    const requiredProviders = ['Microsoft.Compute', 'Microsoft.Network'];
    for (const providerName of requiredProviders) {
      try {
        const provider = await azureFetch(
          token,
          `/subscriptions/${active.id}/providers/${providerName}?api-version=${RESOURCE_API}`,
        );
        if (provider?.registrationState !== 'Registered') {
          await azureFetch(
            token,
            `/subscriptions/${active.id}/providers/${providerName}/register?api-version=${RESOURCE_API}`,
            { method: 'POST' },
          );
          console.log(`Registered provider ${providerName}`);
        }
      } catch (e) {
        return { ok: false, error: `Could not register ${providerName} provider. Please ensure it is available in your subscription.` };
      }
    }

    return { ok: true, subscriptionId: active.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to validate Azure account' };
  }
}

export async function listSubscriptions(
  token: string,
): Promise<Array<{ id: string; displayName: string; state: string }>> {
  const data = await azureFetch(token, `/subscriptions?api-version=2022-12-01`);
  return (data.value ?? []).map((s: any) => ({
    id: s.subscriptionId,
    displayName: s.displayName,
    state: s.state,
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapVMStatus(vm: any): string {
  const provisioningState = vm.properties?.provisioningState ?? '';
  const statuses: any[] = vm.properties?.instanceView?.statuses ?? [];
  const powerStatus = statuses.find((s: any) => s.code?.startsWith('PowerState/'));
  const powerState = powerStatus?.code?.replace('PowerState/', '') ?? '';

  if (provisioningState === 'Creating') return 'provisioning';
  if (provisioningState === 'Failed') return 'error';
  if (provisioningState === 'Deleting') return 'deleting';

  switch (powerState) {
    case 'running':
      return 'active';
    case 'stopped':
    case 'deallocated':
      return 'off';
    case 'starting':
      return 'starting';
    case 'stopping':
    case 'deallocating':
      return 'stopping';
    default:
      return provisioningState.toLowerCase() || 'unknown';
  }
}
