/**
 * Generate cloud-init user data for a ShiftWorker instance.
 * Targets Oracle Cloud Always Free ARM (aarch64) instances by default.
 * Also works on x86_64 — NodeSource and npm install are arch-agnostic.
 */

export interface CloudInitOptions {
  /** Auth token the sidecar uses to talk to the portal. */
  sidecarToken: string;
  /** Portal URL the instance phones home to on completion. */
  portalUrl: string;
  /** Instance ID for phone-home identification. */
  instanceId: string;
  /** Non-root username to create. Default: "claw" */
  username?: string;
  /** OpenClaw version/tag to install. Default: "latest" */
  openclawVersion?: string;
  /** Node.js major version. Default: 22 */
  nodeVersion?: number;
  /** Target architecture. Default: "arm64" (Oracle Cloud Always Free) */
  architecture?: "arm64" | "amd64";
}

export function generateCloudInit(opts: CloudInitOptions): string {
  const user = opts.username ?? "claw";
  const nodeVersion = opts.nodeVersion ?? 22;
  const ocVersion = opts.openclawVersion ?? "latest";
  const _arch = opts.architecture ?? "arm64";

  return `#cloud-config
# ShiftWorker instance provisioning — managed, do not edit
# Target: Oracle Cloud Always Free ARM instances (also works on x86_64)

users:
  - name: ${user}
    groups: sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys: []

package_update: true
package_upgrade: true

packages:
  - ufw
  - curl
  - git
  - unzip

write_files:
  - path: /etc/shiftworker/sidecar.env
    permissions: "0600"
    content: |
      SIDECAR_TOKEN=${opts.sidecarToken}
      PORTAL_URL=${opts.portalUrl}
      INSTANCE_ID=${opts.instanceId}

runcmd:
  # Firewall — allow only SSH + HTTPS + OpenClaw gateway
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp
  - ufw allow 443/tcp
  - ufw allow 3000/tcp
  - ufw --force enable

  # Node.js via NodeSource (supports both aarch64 and x86_64)
  - curl -fsSL https://deb.nodesource.com/setup_${nodeVersion}.x | bash -
  - apt-get install -y nodejs

  # OpenClaw
  - npm install -g openclaw@${ocVersion}

  # Sidecar agent
  - |
    cat > /etc/systemd/system/openclaw-sidecar.service <<'EOF'
    [Unit]
    Description=OpenClaw Sidecar Agent
    After=network-online.target
    Wants=network-online.target

    [Service]
    Type=simple
    User=${user}
    EnvironmentFile=/etc/shiftworker/sidecar.env
    ExecStart=/usr/bin/openclaw gateway start
    Restart=always
    RestartSec=5

    [Install]
    WantedBy=multi-user.target
    EOF
  - systemctl daemon-reload
  - systemctl enable --now openclaw-sidecar

  # Phone home
  - |
    curl -sf -X POST "${opts.portalUrl}/api/instances/${opts.instanceId}/phone-home" \\
      -H "Authorization: Bearer ${opts.sidecarToken}" \\
      -H "Content-Type: application/json" \\
      -d '{"status":"ready"}'
`;
}
