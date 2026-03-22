import type {
  CloudProvider,
  CreateServerOptions,
  ServerInfo,
} from "./types";

const API_BASE = "https://api.hetzner.cloud/v1";
const DEFAULT_SERVER_TYPE = "cx22"; // 2 vCPU, 4 GB RAM, ~€3.99/mo
const DEFAULT_REGION = "nbg1"; // Nuremberg

function getToken(): string {
  const token = process.env.HETZNER_API_TOKEN;
  if (!token) throw new Error("HETZNER_API_TOKEN environment variable is not set");
  return token;
}

async function hetznerFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Hetzner API ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toServerInfo(s: any): ServerInfo {
  return {
    id: String(s.id),
    name: s.name,
    status: s.status,
    publicIpv4: s.public_net?.ipv4?.ip ?? null,
    publicIpv6: s.public_net?.ipv6?.ip ?? null,
    region: s.datacenter?.name ?? "",
    serverType: s.server_type?.name ?? "",
    createdAt: s.created,
    labels: s.labels ?? {},
  };
}

export class HetznerProvider implements CloudProvider {
  async createServer(options: CreateServerOptions): Promise<ServerInfo> {
    const data = await hetznerFetch<{ server: unknown }>("/servers", {
      method: "POST",
      body: JSON.stringify({
        name: options.name,
        server_type: options.serverType ?? DEFAULT_SERVER_TYPE,
        location: options.region ?? DEFAULT_REGION,
        image: "ubuntu-24.04",
        user_data: options.cloudInit ?? undefined,
        labels: options.labels ?? { managed_by: "shiftworker" },
        start_after_create: true,
      }),
    });
    return toServerInfo(data.server);
  }

  async destroyServer(serverId: string): Promise<void> {
    await hetznerFetch(`/servers/${serverId}`, { method: "DELETE" });
  }

  async getServer(serverId: string): Promise<ServerInfo> {
    const data = await hetznerFetch<{ server: unknown }>(`/servers/${serverId}`);
    return toServerInfo(data.server);
  }

  async listServers(labelSelector?: string): Promise<ServerInfo[]> {
    const params = new URLSearchParams();
    if (labelSelector) params.set("label_selector", labelSelector);
    const qs = params.toString();
    const data = await hetznerFetch<{ servers: unknown[] }>(
      `/servers${qs ? `?${qs}` : ""}`,
    );
    return data.servers.map(toServerInfo);
  }

  async powerOn(serverId: string): Promise<void> {
    await hetznerFetch(`/servers/${serverId}/actions/poweron`, {
      method: "POST",
    });
  }

  async powerOff(serverId: string): Promise<void> {
    await hetznerFetch(`/servers/${serverId}/actions/poweroff`, {
      method: "POST",
    });
  }
}
