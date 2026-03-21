/**
 * Generate cloud-init user data for a Claw4All instance.
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
}

export function generateCloudInit(opts: CloudInitOptions): string {
  const user = opts.username ?? "claw";
  const nodeVersion = opts.nodeVersion ?? 22;
  const ocVersion = opts.openclawVersion ?? "latest";

  return `#cloud-config
# Claw4All instance provisioning — managed, do not edit

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
  - path: /etc/claw4all/sidecar.env
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

  # Node.js via NodeSource
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
    EnvironmentFile=/etc/claw4all/sidecar.env
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
