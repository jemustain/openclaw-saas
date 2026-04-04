import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

async function getOpenclawStatus(): Promise<{ running: boolean; version: string; uptime: string }> {
  let running = false;
  let version = 'unknown';
  let uptime = 'unknown';

  try {
    const { stdout } = await execAsync('openclaw --version');
    version = stdout.trim();
  } catch {}

  try {
    await execAsync('systemctl is-active openclaw');
    running = true;
  } catch {
    // Also try pgrep as fallback
    try {
      await execAsync('pgrep -f openclaw');
      running = true;
    } catch {}
  }

  if (running) {
    try {
      const { stdout } = await execAsync("systemctl show openclaw --property=ActiveEnterTimestamp --value");
      uptime = stdout.trim() || 'unknown';
    } catch {}
  }

  return { running, version, uptime };
}

router.get('/openclaw/status', async (_req: Request, res: Response) => {
  const status = await getOpenclawStatus();
  res.json(status);
});

router.post('/openclaw/restart', async (_req: Request, res: Response) => {
  try {
    await execAsync('systemctl restart openclaw');
    res.json({ status: 'restarted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to restart openclaw', details: err.message });
  }
});

router.post('/openclaw/update', async (_req: Request, res: Response) => {
  try {
    await execAsync('npm install -g openclaw@latest');
    // Try both possible service names
    try { await execAsync('systemctl restart openclaw-sidecar'); } catch {
      try { await execAsync('systemctl restart openclaw'); } catch {}
    }
    const { stdout } = await execAsync('openclaw --version');
    res.json({ status: 'updated', version: stdout.trim() });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update openclaw', details: err.message });
  }
});

/** Update the sidecar code itself from GitHub and restart */
router.post('/admin/update-sidecar', async (_req: Request, res: Response) => {
  try {
    const url = 'https://raw.githubusercontent.com/jemustain/openclaw-saas/main/apps/sidecar/dist/sidecar.cjs';
    await execAsync(`curl -sf -L "${url}" -o /opt/shiftworker/sidecar/dist/sidecar.cjs`, { timeout: 30_000 });
    // Restart the sidecar service (this will kill the current process)
    try { await execAsync('systemctl restart shiftworker-sidecar', { timeout: 10_000 }); } catch {}
    res.json({ status: 'updated' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update sidecar', details: err.message });
  }
});

/** Fix OpenClaw config issues (e.g. missing allowFrom for dmPolicy=open) */
router.post('/admin/fix-config', async (_req: Request, res: Response) => {
  try {
    const CLAW_USER = process.env.OPENCLAW_USER || 'claw';
    const configPath = `/home/${CLAW_USER}/.openclaw/openclaw.json`;
    const fs = require('fs');
    
    if (!fs.existsSync(configPath)) {
      res.json({ status: 'no_config' });
      return;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    let fixed = false;
    
    // Fix dmPolicy=open without allowFrom=["*"]
    if (config.channels?.telegram?.dmPolicy === 'open') {
      if (!config.channels.telegram.allowFrom || !config.channels.telegram.allowFrom.includes('*')) {
        config.channels.telegram.allowFrom = ['*'];
        fixed = true;
      }
    }
    
    if (fixed) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      await execAsync(`chown ${CLAW_USER}:${CLAW_USER} ${configPath}`);
    }
    
    res.json({ status: fixed ? 'fixed' : 'ok', fixed });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fix config', details: err.message });
  }
});

/** Configure the AI model on this OpenClaw instance */
router.post('/openclaw/configure-model', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey } = req.body ?? {};
    if (!provider) {
      res.status(400).json({ error: 'Missing provider' });
      return;
    }

    const CLAW_USER = process.env.OPENCLAW_USER || 'claw';
    const configPath = `/home/${CLAW_USER}/.openclaw/openclaw.json`;
    const fs = require('fs');

    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    // Map provider names to OpenClaw model IDs
    // GitHub Copilot OAuth tokens (gho_*) work with GitHub Models API,
    // not the copilot_internal token exchange, so route through openai provider.
    const MODEL_MAP: Record<string, string> = {
      'gemini': 'gemini/gemini-2.5-flash',
      'openai': 'openai/gpt-4o',
      'anthropic': 'anthropic/claude-sonnet-4',
      'github-copilot': 'openai/gpt-4o',
    };

    const modelId = MODEL_MAP[provider];
    if (!modelId) {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }

    // Set the default model using agents.defaults.model (not legacy defaultModel)
    const agents = config.agents = config.agents ?? {};
    const defaults = agents.defaults = agents.defaults ?? {};
    defaults.model = { primary: modelId };
    // Clean up legacy defaultModel if present
    delete config.defaultModel;

    // Map providers to their environment variable for API keys
    const ENV_MAP: Record<string, string> = {
      'gemini': 'GEMINI_API_KEY',
      'openai': 'OPENAI_API_KEY',
      'anthropic': 'ANTHROPIC_API_KEY',
      'github-copilot': 'OPENAI_API_KEY',
    };

    if (apiKey) {
      const envKey = ENV_MAP[provider];
      if (envKey) {
        config.env = config.env ?? {};
        config.env[envKey] = apiKey;
      }
    }

    // GitHub Copilot OAuth tokens use GitHub Models API endpoint
    if (provider === 'github-copilot') {
      config.env = config.env ?? {};
      config.env['OPENAI_BASE_URL'] = 'https://models.inference.ai.azure.com';
      // Clean up stale GITHUB_TOKEN if present (from older sidecar versions)
      delete config.env['GITHUB_TOKEN'];
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    await execAsync(`chown ${CLAW_USER}:${CLAW_USER} ${configPath}`);

    // Restart the OpenClaw gateway to pick up new config
    try { await execAsync('systemctl restart openclaw-sidecar'); } catch {
      try { await execAsync(`su - ${CLAW_USER} -c "openclaw gateway restart"`); } catch {}
    }

    res.json({ status: 'configured', model: modelId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to configure model', details: err.message });
  }
});

export default router;
