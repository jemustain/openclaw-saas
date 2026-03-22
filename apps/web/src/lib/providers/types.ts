/**
 * Cloud provider abstraction for ShiftWorker.
 * Implement this interface to add DigitalOcean, Vultr, etc.
 */

export interface ServerInfo {
  id: string;
  name: string;
  status: string;
  publicIpv4: string | null;
  publicIpv6: string | null;
  region: string;
  serverType: string;
  createdAt: string;
  labels: Record<string, string>;
}

export interface CreateServerOptions {
  name: string;
  region?: string;
  serverType?: string;
  cloudInit?: string;
  labels?: Record<string, string>;
}

export interface CloudProvider {
  createServer(options: CreateServerOptions): Promise<ServerInfo>;
  destroyServer(serverId: string): Promise<void>;
  getServer(serverId: string): Promise<ServerInfo>;
  listServers(labelSelector?: string): Promise<ServerInfo[]>;
  powerOn(serverId: string): Promise<void>;
  powerOff(serverId: string): Promise<void>;
}
