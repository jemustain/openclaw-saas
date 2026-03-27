/**
 * Generate cloud-init user data for a ShiftWorker instance.
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
  const portalUrl = opts.portalUrl.replace(/\/+$/, ''); // trim trailing slashes

  // Using write_files for the systemd service (avoids heredoc YAML issues)
  // and simple runcmd entries (no multi-line blocks that break YAML parsing)
  return `#cloud-config
users:
  - name: ${user}
    groups: sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys: []

package_update: true
package_upgrade: false

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
      PORTAL_URL=${portalUrl}
      INSTANCE_ID=${opts.instanceId}
  - path: /etc/systemd/system/openclaw-sidecar.service
    permissions: "0644"
    content: |
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

runcmd:
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp
  - ufw allow 443/tcp
  - ufw allow 3000/tcp
  - ufw allow 8787/tcp
  - ufw --force enable
  - curl -fsSL https://deb.nodesource.com/setup_${nodeVersion}.x | bash -
  - apt-get install -y nodejs
  - npm install -g openclaw@${ocVersion}
  - systemctl daemon-reload
  - systemctl enable --now openclaw-sidecar
  - curl -sf -X POST "${portalUrl}/api/instances/${opts.instanceId}/phone-home" -H "Authorization: Bearer ${opts.sidecarToken}" -H "Content-Type: application/json" -d '{"status":"ready"}'
`;
}
