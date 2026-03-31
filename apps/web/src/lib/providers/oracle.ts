import type {
  CloudProvider,
  CreateServerOptions,
  ServerInfo,
} from "./types";
import crypto from "crypto";

/**
 * Oracle Cloud Infrastructure (OCI) provider.
 * Uses the OCI REST API with HTTP Signature authentication.
 * Targets Always Free ARM Ampere instances (VM.Standard.A1.Flex).
 */

const DEFAULT_SHAPE = "VM.Standard.A1.Flex";
const DEFAULT_OCPUS = 1;
const DEFAULT_MEMORY_GB = 6;
// Ubuntu 24.04 aarch64 — Oracle-provided platform image (us-phoenix-1)
// This OCID may vary by region; for production, list images to resolve dynamically.
const DEFAULT_IMAGE_OCID =
  "ocid1.image.oc1.phx.aaaaaaaag6hz3v34ssbygepvlvr5jqfctfcfujk6bnlbcaosgz7nyrbl6eaq";

interface OciConfig {
  tenancyOcid: string;
  userOcid: string;
  keyFingerprint: string;
  privateKey: string;
  region: string;
  compartmentOcid: string;
  subnetOcid: string;
}

function getConfig(): OciConfig {
  const required = {
    tenancyOcid: process.env.OCI_TENANCY_OCID,
    userOcid: process.env.OCI_USER_OCID,
    keyFingerprint: process.env.OCI_KEY_FINGERPRINT,
    privateKey: process.env.OCI_PRIVATE_KEY,
    region: process.env.OCI_REGION,
    compartmentOcid: process.env.OCI_COMPARTMENT_OCID,
    subnetOcid: process.env.OCI_SUBNET_OCID,
  } as Record<string, string | undefined>;

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      const envName = `OCI_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
      throw new Error(`${envName} environment variable is not set`);
    }
  }

  return {
    tenancyOcid: required.tenancyOcid!,
    userOcid: required.userOcid!,
    keyFingerprint: required.keyFingerprint!,
    // Support escaped newlines in env vars
    privateKey: required.privateKey!.replace(/\\n/g, "\n"),
    region: required.region!,
    compartmentOcid: required.compartmentOcid!,
    subnetOcid: required.subnetOcid!,
  };
}

function apiBase(region: string): string {
  return `https://iaas.${region}.oraclecloud.com/20160918`;
}

/**
 * Sign an OCI API request per Oracle's HTTP Signature scheme.
 * https://docs.oracle.com/en-us/iaas/Content/API/Concepts/signingrequests.htm
 */
function signRequest(
  config: OciConfig,
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
): Record<string, string> {
  const parsedUrl = new URL(url);
  const date = new Date().toUTCString();
  const host = parsedUrl.host;
  const target = `${method.toLowerCase()} ${parsedUrl.pathname}${parsedUrl.search}`;

  headers["date"] = date;
  headers["host"] = host;
  headers["(request-target)"] = target;

  let headersToSign = ["date", "(request-target)", "host"];

  if (body) {
    const bodyHash = crypto.createHash("sha256").update(body).digest("base64");
    headers["content-type"] = "application/json";
    headers["content-length"] = String(Buffer.byteLength(body));
    headers["x-content-sha256"] = bodyHash;
    headersToSign = [
      "date",
      "(request-target)",
      "host",
      "content-length",
      "content-type",
      "x-content-sha256",
    ];
  }

  const signingString = headersToSign
    .map((h) => `${h}: ${headers[h]}`)
    .join("\n");

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingString);
  const signature = signer.sign(config.privateKey, "base64");

  const keyId = `${config.tenancyOcid}/${config.userOcid}/${config.keyFingerprint}`;
  const authHeader = `Signature version="1",keyId="${keyId}",algorithm="rsa-sha256",headers="${headersToSign.join(" ")}",signature="${signature}"`;

  // Remove pseudo-header before sending
  delete headers["(request-target)"];

  return { ...headers, authorization: authHeader };
}

async function ociFetch<T = unknown>(
  config: OciConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${apiBase(config.region)}${path}`;
  const headers: Record<string, string> = {};
  const bodyStr = body ? JSON.stringify(body) : undefined;

  const signedHeaders = signRequest(config, method, url, headers, bodyStr);

  const res = await fetch(url, {
    method,
    headers: signedHeaders,
    body: bodyStr,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OCI API ${res.status}: ${text}`);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/**
 * Map OCI lifecycle state to a simple status string.
 */
function mapState(lifecycleState: string): string {
  const stateMap: Record<string, string> = {
    PROVISIONING: "initializing",
    STARTING: "initializing",
    RUNNING: "running",
    STOPPING: "stopping",
    STOPPED: "off",
    TERMINATING: "deleting",
    TERMINATED: "deleted",
    MOVING: "migrating",
    CREATING_IMAGE: "rebuilding",
  };
  return stateMap[lifecycleState] ?? lifecycleState.toLowerCase();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toServerInfo(instance: any): ServerInfo {
  // OCI returns VNIC info separately; primary IP may be in metadata or needs a secondary call.
  // For now we store what's available from the instance response.
  return {
    id: instance.id,
    name: instance.displayName ?? "",
    status: mapState(instance.lifecycleState ?? ""),
    publicIpv4: null, // Requires VNIC attachment lookup — populated by caller if needed
    publicIpv6: null,
    region: instance.region ?? "",
    serverType: instance.shape ?? "",
    createdAt: instance.timeCreated ?? "",
    labels: instance.freeformTags ?? {},
  };
}

export class OracleProvider implements CloudProvider {
  private config: OciConfig;

  constructor() {
    this.config = getConfig();
  }

  async createServer(options: CreateServerOptions): Promise<ServerInfo> {
    const body = {
      compartmentId: this.config.compartmentOcid,
      displayName: options.name,
      availabilityDomain: `${this.config.region}-AD-1`, // Most regions have a single AD
      shape: options.serverType ?? DEFAULT_SHAPE,
      shapeConfig: {
        ocpus: DEFAULT_OCPUS,
        memoryInGBs: DEFAULT_MEMORY_GB,
      },
      sourceDetails: {
        sourceType: "image",
        imageId: DEFAULT_IMAGE_OCID,
        bootVolumeSizeInGBs: 50,
      },
      createVnicDetails: {
        subnetId: this.config.subnetOcid,
        assignPublicIp: true,
      },
      metadata: options.cloudInit
        ? { user_data: Buffer.from(options.cloudInit).toString("base64") }
        : undefined,
      freeformTags: options.labels ?? { managed_by: "openclaw-saas" },
    };

    const data = await ociFetch<unknown>(
      this.config,
      "POST",
      "/instances",
      body,
    );
    return toServerInfo(data);
  }

  async destroyServer(serverId: string): Promise<void> {
    await ociFetch(
      this.config,
      "DELETE",
      `/instances/${serverId}?preserveBootVolume=false`,
    );
  }

  async getServer(serverId: string): Promise<ServerInfo> {
    const data = await ociFetch<unknown>(
      this.config,
      "GET",
      `/instances/${serverId}`,
    );
    return toServerInfo(data);
  }

  async listServers(labelSelector?: string): Promise<ServerInfo[]> {
    const params = new URLSearchParams({
      compartmentId: this.config.compartmentOcid,
      lifecycleState: "RUNNING",
    });

    const data = await ociFetch<unknown[]>(
      this.config,
      "GET",
      `/instances?${params.toString()}`,
    );

    let instances = (data as unknown[]) ?? [];

    // Filter by freeform tag if label selector provided (format: "key=value")
    if (labelSelector) {
      const [key, value] = labelSelector.split("=");
      instances = instances.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i: any) => i.freeformTags?.[key] === value,
      );
    }

    return instances.map(toServerInfo);
  }

  async powerOn(serverId: string): Promise<void> {
    await ociFetch(
      this.config,
      "POST",
      `/instances/${serverId}?action=START`,
    );
  }

  async powerOff(serverId: string): Promise<void> {
    await ociFetch(
      this.config,
      "POST",
      `/instances/${serverId}?action=STOP`,
    );
  }
}
