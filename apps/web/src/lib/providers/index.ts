import type { CloudProvider } from "./types";
import { OracleProvider } from "./oracle";
import { DigitalOceanProvider } from "./digitalocean";
import { HetznerProvider } from "./hetzner";

export { OracleProvider } from "./oracle";
export { DigitalOceanProvider } from "./digitalocean";
export { HetznerProvider } from "./hetzner";
export { generateCloudInit } from "./cloud-init";
export type { CloudProvider, ServerInfo, CreateServerOptions } from "./types";
export type { CloudInitOptions } from "./cloud-init";

/**
 * Factory: resolve a cloud provider by name.
 * Defaults to Oracle Cloud (Always Free tier).
 */
export function getProvider(name?: string): CloudProvider {
  switch (name ?? process.env.CLOUD_PROVIDER ?? "oracle") {
    case "oracle":
      return new OracleProvider();
    case "digitalocean":
      return new DigitalOceanProvider();
    case "hetzner":
      return new HetznerProvider();
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
