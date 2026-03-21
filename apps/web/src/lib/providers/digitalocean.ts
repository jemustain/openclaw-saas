const API = 'https://api.digitalocean.com/v2';
const TAG = 'handsoff';

interface DropletOptions {
  name: string;
  cloudInit?: string;
  size?: string;
  region?: string;
  image?: string;
}

interface Droplet {
  id: number;
  name: string;
  status: string;
  networks: {
    v4: Array<{ ip_address: string; type: string }>;
  };
  region: { slug: string };
}

async function doFetch(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`DigitalOcean API error ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function createDroplet(token: string, options: DropletOptions) {
  const body = {
    name: options.name,
    region: options.region ?? 'nyc1',
    size: options.size ?? 's-1vcpu-1gb',
    image: options.image ?? 'ubuntu-24-04-x64',
    tags: [TAG],
    user_data: options.cloudInit,
  };
  const data = await doFetch(token, '/droplets', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const droplet: Droplet = data.droplet;
  const publicIp = droplet.networks?.v4?.find((n: any) => n.type === 'public')?.ip_address ?? null;
  return {
    id: droplet.id,
    name: droplet.name,
    status: droplet.status,
    publicIpv4: publicIp,
    region: droplet.region.slug,
  };
}

export async function destroyDroplet(token: string, dropletId: number) {
  await doFetch(token, `/droplets/${dropletId}`, { method: 'DELETE' });
}

export async function getDroplet(token: string, dropletId: number) {
  const data = await doFetch(token, `/droplets/${dropletId}`);
  const d: Droplet = data.droplet;
  return {
    id: d.id,
    name: d.name,
    status: d.status,
    publicIpv4: d.networks?.v4?.find((n: any) => n.type === 'public')?.ip_address ?? null,
    region: d.region.slug,
  };
}

export async function listDroplets(token: string) {
  const data = await doFetch(token, `/droplets?tag_name=${TAG}`);
  return (data.droplets as Droplet[]).map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    publicIpv4: d.networks?.v4?.find((n: any) => n.type === 'public')?.ip_address ?? null,
    region: d.region.slug,
  }));
}

export async function powerOn(token: string, dropletId: number) {
  await doFetch(token, `/droplets/${dropletId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ type: 'power_on' }),
  });
}

export async function powerOff(token: string, dropletId: number) {
  await doFetch(token, `/droplets/${dropletId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ type: 'power_off' }),
  });
}
