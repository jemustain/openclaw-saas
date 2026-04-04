"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const router = (0, express_1.Router)();
async function getOpenclawStatus() {
    let running = false;
    let version = 'unknown';
    let uptime = 'unknown';
    try {
        const { stdout } = await execAsync('openclaw --version');
        version = stdout.trim();
    }
    catch { }
    try {
        await execAsync('systemctl is-active openclaw');
        running = true;
    }
    catch {
        // Also try pgrep as fallback
        try {
            await execAsync('pgrep -f openclaw');
            running = true;
        }
        catch { }
    }
    if (running) {
        try {
            const { stdout } = await execAsync("systemctl show openclaw --property=ActiveEnterTimestamp --value");
            uptime = stdout.trim() || 'unknown';
        }
        catch { }
    }
    return { running, version, uptime };
}
router.get('/openclaw/status', async (_req, res) => {
    const status = await getOpenclawStatus();
    res.json(status);
});
router.post('/openclaw/restart', async (_req, res) => {
    try {
        await execAsync('systemctl restart openclaw');
        res.json({ status: 'restarted' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to restart openclaw', details: err.message });
    }
});
router.post('/openclaw/update', async (_req, res) => {
    try {
        await execAsync('npm install -g openclaw@latest');
        // Try both possible service names
        try {
            await execAsync('systemctl restart openclaw-sidecar');
        }
        catch {
            try {
                await execAsync('systemctl restart openclaw');
            }
            catch { }
        }
        const { stdout } = await execAsync('openclaw --version');
        res.json({ status: 'updated', version: stdout.trim() });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update openclaw', details: err.message });
    }
});
/** Update the sidecar code itself from GitHub and restart */
router.post('/admin/update-sidecar', async (_req, res) => {
    try {
        const url = 'https://raw.githubusercontent.com/jemustain/openclaw-saas/main/apps/sidecar/dist/sidecar.cjs';
        await execAsync(`curl -sf -L "${url}" -o /opt/shiftworker/sidecar/dist/sidecar.cjs`, { timeout: 30_000 });
        // Restart the sidecar service (this will kill the current process)
        try {
            await execAsync('systemctl restart shiftworker-sidecar', { timeout: 10_000 });
        }
        catch { }
        res.json({ status: 'updated' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update sidecar', details: err.message });
    }
});
/** Fix OpenClaw config issues (e.g. missing allowFrom for dmPolicy=open) */
router.post('/admin/fix-config', async (_req, res) => {
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
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fix config', details: err.message });
    }
});
/** Configure the AI model on this OpenClaw instance */
router.post('/openclaw/configure-model', async (req, res) => {
    try {
        const { provider, apiKey } = req.body ?? {};
        if (!provider) {
            res.status(400).json({ error: 'Missing provider' });
            return;
        }
        const CLAW_USER = process.env.OPENCLAW_USER || 'claw';
        const configPath = `/home/${CLAW_USER}/.openclaw/openclaw.json`;
        const fs = require('fs');
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        // Map provider names to OpenClaw model IDs
        const MODEL_MAP = {
            'gemini': 'gemini/gemini-2.5-flash',
            'openai': 'openai/gpt-4o',
            'anthropic': 'anthropic/claude-sonnet-4',
            'github-copilot': 'github-copilot/claude-sonnet-4',
        };
        const modelId = MODEL_MAP[provider];
        if (!modelId) {
            res.status(400).json({ error: `Unknown provider: ${provider}` });
            return;
        }
        // Set the default model
        config.defaultModel = modelId;
        // For providers that need API keys, set env vars
        if (apiKey && provider !== 'github-copilot') {
            const envMap = {
                'gemini': 'GEMINI_API_KEY',
                'openai': 'OPENAI_API_KEY',
                'anthropic': 'ANTHROPIC_API_KEY',
            };
            const envKey = envMap[provider];
            if (envKey) {
                config.env = config.env ?? {};
                config.env[envKey] = apiKey;
            }
        }
        // For GitHub Copilot, set up the OAuth token if provided
        if (provider === 'github-copilot' && apiKey) {
            config.env = config.env ?? {};
            config.env.GITHUB_TOKEN = apiKey;
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        await execAsync(`chown ${CLAW_USER}:${CLAW_USER} ${configPath}`);
        // Restart the OpenClaw gateway to pick up new config
        try {
            await execAsync('systemctl restart openclaw-sidecar');
        }
        catch {
            try {
                await execAsync(`su - ${CLAW_USER} -c "openclaw gateway restart"`);
            }
            catch { }
        }
        res.json({ status: 'configured', model: modelId });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to configure model', details: err.message });
    }
});
exports.default = router;
