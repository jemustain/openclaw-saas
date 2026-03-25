import type { CloudProvider } from "./types";
import { OracleProvider } from "./oracle";

export { OracleProvider } from "./oracle";
export { HetznerProvider } from "./hetzner"; // Planned — not yet active
export { generateCloudInit } from "./cloud-init";
export type { CloudProvider, ServerInfo, CreateServerOptions } from "./types";
export type { CloudInitOptions } from "./cloud-init";

// Note: DigitalOcean provider is exported as functions, not a class implementing CloudProvider
// See ./digitalocean.ts for the DO API client

export function getProvider(name?: string): CloudProvider {
  switch (name ?? process.env.CLOUD_PROVIDER ?? "oracle") {
    case "oracle":
      return new OracleProvider();
    case "hetzner":
      // Legacy — kept for reference
      const { HetznerProvider } = require("./hetzner");
      return new HetznerProvider();
    default:
      throw new Error(`Unknown CloudProvider: ${name}. DigitalOcean uses its own API client.`);
  }
}
