/**
 * Generate cloud-init user data for a ShiftWorker instance.
 */

export interface CloudInitOptions {
  sidecarToken: string;
  portalUrl: string;
  instanceId: string;
  username?: string;
  openclawVersion?: string;
  nodeVersion?: number;
}

export function generateCloudInit(opts: CloudInitOptions): string {
  const user = opts.username ?? "claw";
  const nodeVersion = opts.nodeVersion ?? 22;
  const ocVersion = opts.openclawVersion ?? "latest";
  const portalUrl = opts.portalUrl.replace(/\/+$/, '').replace(/\s+/g, '');
  const sidecarToken = opts.sidecarToken.replace(/\s+/g, '');
  const instanceId = opts.instanceId.replace(/\s+/g, '');

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
      SIDECAR_TOKEN=${sidecarToken}
      PORTAL_URL=${portalUrl}
      INSTANCE_ID=${instanceId}
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
      ExecStart=/usr/bin/openclaw gateway run --bind lan --port 8787 --allow-unconfigured
      Restart=always
      RestartSec=5
      [Install]
      WantedBy=multi-user.target
  - path: /opt/shiftworker/patch-config.py
    permissions: "0755"
    content: |
      #!/usr/bin/env python3
      import json, os, sys, pwd
      user = sys.argv[1] if len(sys.argv) > 1 else "claw"
      config_path = os.path.join("/home", user, ".openclaw", "openclaw.json")
      config = {}
      if os.path.exists(config_path):
          with open(config_path) as f:
              config = json.load(f)
      gw = config.setdefault("gateway", {})
      gw["mode"] = "local"
      gw["bind"] = "lan"
      gw["controlUi"] = {"dangerouslyAllowHostHeaderOriginFallback": True}
      with open(config_path, "w") as f:
          json.dump(config, f, indent=2)
      pw = pwd.getpwnam(user)
      os.chown(config_path, pw.pw_uid, pw.pw_gid)
  - path: /opt/shiftworker/setup.sh
    permissions: "0755"
    content: |
      #!/bin/bash
      set -ex
      ufw default deny incoming
      ufw default allow outgoing
      ufw allow 22/tcp
      ufw allow 443/tcp
      ufw allow 3000/tcp
      ufw allow 8787/tcp
      ufw --force enable
      curl -fsSL https://deb.nodesource.com/setup_${nodeVersion}.x | bash -
      apt-get install -y nodejs
      npm install -g openclaw@${ocVersion}
      # Set up OpenClaw gateway for the claw user
      su - ${user} -c "openclaw gateway install" || true
      # Configure gateway for LAN binding (required for sidecar to accept remote connections)
      python3 /opt/shiftworker/patch-config.py ${user}
      systemctl daemon-reload
      systemctl enable --now openclaw-sidecar
      source /etc/shiftworker/sidecar.env
      curl -sf -X POST "$PORTAL_URL/api/instances/$INSTANCE_ID/phone-home" \\
        -H "Authorization: Bearer $SIDECAR_TOKEN" \\
        -H "Content-Type: application/json" \\
        -d '{"status":"ready"}' || true

runcmd:
  - [bash, /opt/shiftworker/setup.sh]
`;
}
