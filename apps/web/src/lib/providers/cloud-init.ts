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
  telegramBotToken?: string;
}

export function generateCloudInit(opts: CloudInitOptions): string {
  const user = opts.username ?? "claw";
  const nodeVersion = opts.nodeVersion ?? 22;
  const ocVersion = opts.openclawVersion ?? "latest";
  const portalUrl = opts.portalUrl.replace(/\/+$/, '').replace(/\s+/g, '');
  const sidecarToken = opts.sidecarToken.replace(/\s+/g, '');
  const instanceId = opts.instanceId.replace(/\s+/g, '');

  // Build optional write_files entries
  const extraWriteFiles: string[] = [];

  if (opts.telegramBotToken) {
    extraWriteFiles.push(`  - path: /opt/shiftworker/configure-telegram.py
    permissions: "0755"
    content: |
      #!/usr/bin/env python3
      import json, os, pwd
      user = '${user}'
      config_path = os.path.join('/home', user, '.openclaw', 'openclaw.json')
      config = {}
      if os.path.exists(config_path):
          with open(config_path) as f:
              config = json.load(f)
      channels = config.setdefault('channels', {})
      tg = channels.setdefault('telegram', {})
      tg['dmPolicy'] = 'open'
      tg['allowFrom'] = ['*']
      tg['groupPolicy'] = 'open'
      tg['groups'] = {'*': {'requireMention': True}}
      with open(config_path, 'w') as f:
          json.dump(config, f, indent=2)
      pw = pwd.getpwnam(user)
      os.chown(config_path, pw.pw_uid, pw.pw_gid)`);
  }

  // Build the setup.sh content with proper indentation

  const telegramSetupBlock = opts.telegramBotToken ? `
      # Configure Telegram bot
      echo "Configuring Telegram bot..."
      TELEGRAM_TOKEN="${opts.telegramBotToken.replace(/"/g, '\\"')}"
      python3 /opt/shiftworker/configure-telegram.py
      su - ${user} -c "openclaw channels add --channel telegram --token $TELEGRAM_TOKEN" || true
      systemctl restart openclaw-sidecar
      sleep 5` : '';

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
      Description=OpenClaw Gateway
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
  - path: /etc/systemd/system/shiftworker-sidecar.service
    permissions: "0644"
    content: |
      [Unit]
      Description=ShiftWorker Sidecar API
      After=openclaw-sidecar.service
      Wants=openclaw-sidecar.service
      [Service]
      Type=simple
      User=root
      EnvironmentFile=/etc/shiftworker/sidecar.env
      Environment=PORT=8788
      Environment=OPENCLAW_USER=${user}
      WorkingDirectory=/opt/shiftworker/sidecar
      ExecStart=/usr/bin/node dist/sidecar.cjs
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
${extraWriteFiles.length > 0 ? extraWriteFiles.join('\n') + '\n' : ''}  - path: /opt/shiftworker/setup.sh
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
      ufw allow 8788/tcp
      ufw --force enable
      curl -fsSL https://deb.nodesource.com/setup_${nodeVersion}.x | bash -
      apt-get install -y nodejs
      npm install -g openclaw@${ocVersion}
      # Set up OpenClaw gateway for the claw user
      su - ${user} -c "openclaw gateway install" || true
      # Configure gateway for LAN binding (required for sidecar to accept remote connections)
      python3 /opt/shiftworker/patch-config.py ${user}
      # Install ShiftWorker sidecar from GitHub
      mkdir -p /opt/shiftworker/sidecar/dist
      cd /opt/shiftworker/sidecar
      curl -sf -L "https://raw.githubusercontent.com/jemustain/openclaw-saas/main/apps/sidecar/dist/sidecar.cjs" -o dist/sidecar.cjs
      echo '{"dependencies":{"@whiskeysockets/baileys":"^6.7.16","express":"^4.21.0","pino":"^9.6.0","ws":"^8.18.0"}}' > package.json
      npm install --production 2>/dev/null
      # Install sidecar auto-update script and cron job
      curl -sf -L "https://raw.githubusercontent.com/jemustain/openclaw-saas/main/apps/sidecar/scripts/auto-update.sh" -o /opt/shiftworker/sidecar/auto-update.sh
      chmod +x /opt/shiftworker/sidecar/auto-update.sh
      echo "0 * * * * root /opt/shiftworker/sidecar/auto-update.sh" > /etc/cron.d/shiftworker-sidecar-update
      chmod 644 /etc/cron.d/shiftworker-sidecar-update
      # Start services
      systemctl daemon-reload
      systemctl enable --now openclaw-sidecar
      systemctl enable --now shiftworker-sidecar
      # Health check: verify sidecar is responding
      HEALTH_OK=0
      for i in 1 2 3 4 5; do
        if curl -sf http://localhost:8788/health > /dev/null 2>&1; then
          HEALTH_OK=1
          break
        fi
        echo "Health check attempt $i failed, retrying in 5s..."
        sleep 5
      done
      if [ "$HEALTH_OK" -eq 0 ]; then
        echo "WARNING: Sidecar health check failed after 5 attempts"
        systemctl restart shiftworker-sidecar
        sleep 10
      fi${telegramSetupBlock}
      # Phone home to portal
      source /etc/shiftworker/sidecar.env
      curl -sf -X POST "$PORTAL_URL/api/instances/$INSTANCE_ID/phone-home" \\
        -H "Authorization: Bearer $SIDECAR_TOKEN" \\
        -H "Content-Type: application/json" \\
        -d '{"status":"ready"}' || true

runcmd:
  - [bash, /opt/shiftworker/setup.sh]
`;
}
