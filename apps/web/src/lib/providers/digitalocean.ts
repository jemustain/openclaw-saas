import type {
  CloudProvider,
  CreateServerOptions,
  ServerInfo,
} from "./types";

/**
 * DigitalOcean provider stub — placeholder for future paid tier.
 * All methods throw; this provider is not yet implemented.
 */

const NOT_READY = "DigitalOcean provider coming soon — use Oracle Cloud (free tier) for now";

export class DigitalOceanProvider implements CloudProvider {
  async createServer(_options: CreateServerOptions): Promise<ServerInfo> {
    throw new Error(NOT_READY);
  }

  async destroyServer(_serverId: string): Promise<void> {
    throw new Error(NOT_READY);
  }

  async getServer(_serverId: string): Promise<ServerInfo> {
    throw new Error(NOT_READY);
  }

  async listServers(_labelSelector?: string): Promise<ServerInfo[]> {
    throw new Error(NOT_READY);
  }

  async powerOn(_serverId: string): Promise<void> {
    throw new Error(NOT_READY);
  }

  async powerOff(_serverId: string): Promise<void> {
    throw new Error(NOT_READY);
  }
}
