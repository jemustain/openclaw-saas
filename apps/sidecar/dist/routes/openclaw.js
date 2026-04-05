"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const router = (0, express_1.Router)();
// In-memory store for device flow state
const deviceFlowStore = {};
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
const COPILOT_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
/** Start GitHub Copilot device flow authentication */
router.post('/openclaw/github-copilot-device-start', async (_req, res) => {
    try {
        const ghRes = await fetch('https://github.com/login/device/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ client_id: COPILOT_CLIENT_ID, scope: 'read:user' }),
        });
        if (!ghRes.ok) {
            const text = await ghRes.text();
            res.status(502).json({ error: 'GitHub device code request failed', details: text });
            return;
        }
        const data = await ghRes.json();
        const { device_code, user_code, verification_uri, expires_in, interval } = data;
        deviceFlowStore['copilot-device'] = {
            deviceCode: device_code,
            expiresAt: Date.now() + (expires_in ?? 900) * 1000,
            interval: interval ?? 5,
        };
        res.json({
            userCode: user_code,
            verificationUri: verification_uri,
            deviceCode: device_code,
            expiresIn: expires_in,
            interval: interval ?? 5,
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to start device flow', details: err.message });
    }
});
/** Poll GitHub Copilot device flow status */
router.get('/openclaw/github-copilot-device-status', async (_req, res) => {
    try {
        const stored = deviceFlowStore['copilot-device'];
        if (!stored) {
            res.json({ status: 'error', error: 'No device flow in progress. Call device-start first.' });
            return;
        }
        if (Date.now() > stored.expiresAt) {
            delete deviceFlowStore['copilot-device'];
            res.json({ status: 'expired' });
            return;
        }
        const ghRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                client_id: COPILOT_CLIENT_ID,
                device_code: stored.deviceCode,
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            }),
        });
        const data = await ghRes.json();
        if (data.error === 'authorization_pending') {
            res.json({ status: 'pending' });
            return;
        }
        if (data.error === 'slow_down') {
            stored.interval = (stored.interval ?? 5) + 5;
            res.json({ status: 'pending' });
            return;
        }
        if (data.error === 'expired_token') {
            delete deviceFlowStore['copilot-device'];
            res.json({ status: 'expired' });
            return;
        }
        if (data.error) {
            delete deviceFlowStore['copilot-device'];
            res.json({ status: 'error', error: data.error_description || data.error });
            return;
        }
        if (data.access_token) {
            delete deviceFlowStore['copilot-device'];
            const token = data.access_token;
            // Store token in OpenClaw auth profile store
            const CLAW_USER = process.env.OPENCLAW_USER || 'claw';
            const stateDir = path.join('/home', CLAW_USER, '.openclaw', 'state');
            const authProfilesPath = path.join(stateDir, 'auth-profiles.json');
            if (!fs.existsSync(stateDir)) {
                fs.mkdirSync(stateDir, { recursive: true });
            }
            let profiles = { profiles: {} };
            if (fs.existsSync(authProfilesPath)) {
                try {
                    profiles = JSON.parse(fs.readFileSync(authProfilesPath, 'utf8'));
                }
                catch { }
            }
            profiles.profiles = profiles.profiles ?? {};
            profiles.profiles['github-copilot:github'] = {
                type: 'token',
                provider: 'github-copilot',
                token: token,
            };
            fs.writeFileSync(authProfilesPath, JSON.stringify(profiles, null, 2));
            try {
                await execAsync(`chown -R ${CLAW_USER}:${CLAW_USER} ${stateDir}`);
            }
            catch { }
            // Update openclaw.json config
            const configPath = path.join('/home', CLAW_USER, '.openclaw', 'openclaw.json');
            let config = {};
            if (fs.existsSync(configPath)) {
                try {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }
                catch { }
            }
            const agents = config.agents = config.agents ?? {};
            const defaults = agents.defaults = agents.defaults ?? {};
            defaults.model = { primary: 'github-copilot/gpt-4o', authProfile: 'github-copilot:github' };
            delete config.defaultModel;
            // Remove stale env vars since we're using auth profiles
            if (config.env) {
                delete config.env['OPENAI_API_KEY'];
                delete config.env['OPENAI_BASE_URL'];
                delete config.env['GITHUB_TOKEN'];
                if (Object.keys(config.env).length === 0)
                    delete config.env;
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            try {
                await execAsync(`chown ${CLAW_USER}:${CLAW_USER} ${configPath}`);
            }
            catch { }
            // Remove stale keys from config.env file if it exists
            const configEnvPath = path.join('/home', CLAW_USER, '.openclaw', 'config.env');
            if (fs.existsSync(configEnvPath)) {
                try {
                    let envContent = fs.readFileSync(configEnvPath, 'utf8');
                    envContent = envContent
                        .split('\n')
                        .filter(line => !line.startsWith('OPENAI_API_KEY=') && !line.startsWith('OPENAI_BASE_URL=') && !line.startsWith('GITHUB_TOKEN='))
                        .join('\n');
                    fs.writeFileSync(configEnvPath, envContent);
                    try {
                        await execAsync(`chown ${CLAW_USER}:${CLAW_USER} ${configEnvPath}`);
                    }
                    catch { }
                }
                catch { }
            }
            // Restart OpenClaw gateway
            try {
                await execAsync('systemctl restart openclaw-sidecar');
            }
            catch {
                try {
                    await execAsync(`su - ${CLAW_USER} -c "openclaw gateway restart"`);
                }
                catch { }
            }
            res.json({ status: 'authorized', model: 'github-copilot/gpt-4o' });
            return;
        }
        res.json({ status: 'error', error: 'Unexpected response from GitHub' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to check device flow status', details: err.message });
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
        // GitHub Copilot OAuth tokens (gho_*) work with GitHub Models API,
        // not the copilot_internal token exchange, so route through openai provider.
        const MODEL_MAP = {
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
        const ENV_MAP = {
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
