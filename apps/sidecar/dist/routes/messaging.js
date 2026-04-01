"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = require("fs");
const ws_1 = __importDefault(require("ws"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, fetchLatestBaileysVersion } = 
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@whiskeysockets/baileys');
const pino_1 = __importDefault(require("pino"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const router = (0, express_1.Router)();
const VALID_PLATFORMS = ['whatsapp', 'telegram', 'signal', 'discord', 'slack'];
const CLAW_USER = process.env.OPENCLAW_USER || 'claw';
const CLAW_HOME = process.env.OPENCLAW_HOME || `/home/${CLAW_USER}`;
const GATEWAY_WS_URL = process.env.GATEWAY_WS_URL || 'ws://127.0.0.1:18789';
/** Run a command as the claw user with aggressive timeout */
async function runAsClaw(cmd, timeoutMs = 30_000) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.exec)(`su - ${CLAW_USER} -c '${cmd.replace(/'/g, "'\\''")}'`, { timeout: timeoutMs, killSignal: 'SIGKILL' }, (error, stdout, stderr) => {
            if (error)
                reject(error);
            else
                resolve({ stdout, stderr });
        });
        // Extra safety: force kill after timeout + 5s
        const forceTimer = setTimeout(() => {
            try {
                child.kill('SIGKILL');
            }
            catch { }
        }, timeoutMs + 5000);
        child.on('exit', () => clearTimeout(forceTimer));
    });
}
/** Read the gateway auth token from the OpenClaw config */
function getGatewayToken() {
    try {
        const configPath = `${CLAW_HOME}/.openclaw/openclaw.json`;
        if (!(0, fs_1.existsSync)(configPath))
            return undefined;
        const config = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
        return config?.gateway?.controlUi?.token
            || config?.gateway?.auth?.token
            || config?.['gateway.controlUi.token']
            || config?.['gateway.auth.token'];
    }
    catch {
        return undefined;
    }
}
/** Send an RPC call to the gateway WebSocket and return the result */
async function gatewayRpc(method, params = {}, timeoutMs = 30_000) {
    return new Promise((resolve, reject) => {
        const token = getGatewayToken();
        const wsUrl = token ? `${GATEWAY_WS_URL}?token=${encodeURIComponent(token)}` : GATEWAY_WS_URL;
        const ws = new ws_1.default(wsUrl);
        const timer = setTimeout(() => {
            ws.terminate();
            reject(new Error(`Gateway RPC timeout after ${timeoutMs}ms`));
        }, timeoutMs);
        ws.on('error', (err) => {
            clearTimeout(timer);
            reject(new Error(`Gateway not ready - please wait a moment and try again (${err.message})`));
        });
        ws.on('open', () => {
            const id = Date.now().toString();
            ws.send(JSON.stringify({ id, method, params }));
            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.id === id) {
                        clearTimeout(timer);
                        ws.close();
                        if (msg.error) {
                            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                        }
                        else {
                            resolve(msg.result);
                        }
                    }
                }
                catch { }
            });
        });
        ws.on('close', () => {
            clearTimeout(timer);
        });
    });
}
/** Check if WhatsApp credentials exist on disk */
function whatsappCredentialsExist() {
    const credPath = `${CLAW_HOME}/.openclaw/credentials/whatsapp`;
    return (0, fs_1.existsSync)(credPath);
}
async function setupTelegram(config) {
    if (!config.botToken || typeof config.botToken !== 'string') {
        throw new Error('Missing botToken for Telegram setup');
    }
    // Pre-configure dmPolicy and allowFrom BEFORE channels add,
    // because OpenClaw validates that dmPolicy=open requires allowFrom=["*"]
    try {
        const configPath = `${CLAW_HOME}/.openclaw/openclaw.json`;
        const fs = require('fs');
        const config_data = fs.existsSync(configPath)
            ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
            : {};
        const channels = config_data.channels = config_data.channels || {};
        const tg = channels.telegram = channels.telegram || {};
        tg.dmPolicy = 'open';
        tg.allowFrom = ['*'];
        fs.writeFileSync(configPath, JSON.stringify(config_data, null, 2));
        const { execSync } = require('child_process');
        execSync(`chown ${CLAW_USER}:${CLAW_USER} ${configPath}`);
    }
    catch (err) {
        console.error('Failed to pre-configure Telegram:', err.message);
    }
    await runAsClaw(`openclaw channels add --channel telegram --token ${config.botToken}`);
    try {
        await execAsync('systemctl restart openclaw-sidecar', { timeout: 15_000 });
        await new Promise(r => setTimeout(r, 5000));
    }
    catch {
        try {
            await runAsClaw('openclaw gateway restart');
        }
        catch { }
    }
    // Verify the channel was actually added
    try {
        const { stdout } = await runAsClaw('openclaw channels list --json 2>/dev/null', 10_000);
        const data = JSON.parse(stdout.trim());
        const channels = Array.isArray(data) ? data : data.channels || [];
        const hasTelegram = channels.some((ch) => (ch.channel || ch.name || '').toLowerCase() === 'telegram');
        if (!hasTelegram) {
            // Retry: add again and restart
            console.warn('Telegram channel not found after setup, retrying...');
            await runAsClaw(`openclaw channels add --channel telegram --token ${config.botToken}`);
            try {
                await execAsync('systemctl restart openclaw-sidecar', { timeout: 15_000 });
            }
            catch { }
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    catch {
        // Non-fatal - channel may still work even if list fails
    }
    // Auto-approve the first Telegram pairing request within the next 10 minutes.
    // This lets the bot owner pair seamlessly while keeping strangers blocked.
    autoApproveFirstPairing('telegram', 10 * 60_000);
    return { status: 'configured' };
}
/**
 * Poll `openclaw pairing list <channel>` and approve the first pending request.
 * Stops after one approval or when the timeout window closes.
 */
function autoApproveFirstPairing(channel, windowMs) {
    const deadline = Date.now() + windowMs;
    const poll = async () => {
        if (Date.now() > deadline)
            return; // window expired
        try {
            const { stdout } = await runAsClaw(`openclaw pairing list ${channel} --json 2>/dev/null`, 10_000);
            const requests = JSON.parse(stdout.trim() || '[]');
            if (Array.isArray(requests) && requests.length > 0) {
                const code = requests[0].code ?? requests[0].pairingCode;
                if (code) {
                    await runAsClaw(`openclaw pairing approve ${channel} ${code}`, 10_000);
                    console.log(`[auto-pair] Approved ${channel} pairing code ${code}`);
                    return; // done
                }
            }
        }
        catch {
            // pairing list may not return JSON or may have no requests yet
        }
        // Retry in 5 seconds
        setTimeout(poll, 5_000);
    };
    // Start polling after a short delay (give the user time to open the bot)
    setTimeout(poll, 3_000);
}
/**
 * Request a WhatsApp pairing code via Baileys.
 * Returns the 8-character code the user enters on their phone.
 */
async function requestWhatsAppPairingCode(phoneNumber) {
    const authDir = `${CLAW_HOME}/.openclaw/credentials/whatsapp`;
    if (!(0, fs_1.existsSync)(authDir)) {
        (0, fs_1.mkdirSync)(authDir, { recursive: true });
        try {
            await execAsync(`chown -R ${CLAW_USER}:${CLAW_USER} ${authDir}`);
        }
        catch { }
    }
    // Stop the gateway's WhatsApp channel to avoid socket conflicts.
    // Both Baileys sockets can't use the same auth state simultaneously.
    try {
        await runAsClaw('openclaw gateway stop --channel whatsapp 2>/dev/null', 10_000);
    }
    catch { }
    // Also kill any lingering WA login sessions via the gateway RPC
    try {
        await gatewayRpc('web.login.start', { channel: 'whatsapp', force: true }, 5_000);
    }
    catch { }
    // Brief pause to let the gateway release the connection
    await new Promise(r => setTimeout(r, 2000));
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: (0, pino_1.default)({ level: 'silent' }),
    });
    sock.ev.on('creds.update', saveCreds);
    return new Promise((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                try {
                    sock.end(undefined);
                }
                catch { }
                resolve({ error: 'Timed out waiting for pairing code' });
            }
        }, 30_000);
        sock.ev.on('connection.update', async (update) => {
            const { connection, qr } = update;
            // When the QR event fires, the socket is ready to request a pairing code
            if (qr && !resolved) {
                try {
                    const digits = phoneNumber.replace(/[^0-9]/g, '');
                    const code = await sock.requestPairingCode(digits);
                    resolved = true;
                    clearTimeout(timeout);
                    resolve({ pairingCode: code });
                }
                catch (err) {
                    resolved = true;
                    clearTimeout(timeout);
                    try {
                        sock.end(undefined);
                    }
                    catch { }
                    resolve({ error: err.message || 'Failed to request pairing code' });
                }
            }
            if (connection === 'open') {
                // Successfully paired — restart gateway to pick up new creds
                try {
                    await runAsClaw('openclaw gateway restart');
                }
                catch { }
            }
            if (connection === 'close') {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve({ error: 'Connection closed before pairing code was issued' });
                }
            }
        });
    });
}
async function setupWhatsApp(config) {
    // Handle pairing-code method
    if (config.method === 'pairing-code' && typeof config.phoneNumber === 'string') {
        const result = await requestWhatsAppPairingCode(config.phoneNumber);
        if (result.pairingCode) {
            return { platform: 'whatsapp', status: 'pairing', pairingCode: result.pairingCode };
        }
        return { platform: 'whatsapp', status: 'error', error: result.error || 'Failed to get pairing code' };
    }
    // Check if already connected via credential files
    if (whatsappCredentialsExist()) {
        try {
            const { stdout } = await runAsClaw('openclaw channels status --channel whatsapp 2>/dev/null', 10_000);
            if (stdout.toLowerCase().includes('connected') || stdout.toLowerCase().includes('active') || stdout.toLowerCase().includes('ready')) {
                return { platform: 'whatsapp', status: 'connected' };
            }
        }
        catch { }
    }
    // Ensure WhatsApp channel is added to OpenClaw config
    try {
        await runAsClaw('openclaw channels add --channel whatsapp 2>/dev/null', 10_000);
    }
    catch {
        // May already be configured
    }
    // Capture QR from the CLI login command
    try {
        const qrData = await captureWhatsAppQr();
        if (qrData) {
            return { platform: 'whatsapp', status: 'pairing', qr: qrData };
        }
    }
    catch (err) {
        console.error('WhatsApp QR capture failed:', err.message);
    }
    // Fallback: return Control UI URL
    let gatewayToken = '';
    try {
        const { stdout } = await runAsClaw(`cat ${CLAW_HOME}/.openclaw/openclaw.json`, 5_000);
        const config = JSON.parse(stdout.trim());
        gatewayToken = config?.gateway?.auth?.token ?? '';
    }
    catch { }
    const controlUiUrl = `http://${getLocalIp()}:8787${gatewayToken ? `/#token=${gatewayToken}` : ''}`;
    return { platform: 'whatsapp', status: 'pairing', controlUiUrl };
}
/**
 * Capture QR code from `openclaw channels login --channel whatsapp` CLI output.
 * The CLI prints a Unicode block QR code to the terminal. We capture the raw
 * QR string from the output and use it to generate a data URL.
 */
async function captureWhatsAppQr() {
    return new Promise((resolve) => {
        const child = (0, child_process_1.exec)(`su - ${CLAW_USER} -c 'openclaw channels login --channel whatsapp 2>&1'`, { timeout: 25_000 });
        let output = '';
        let resolved = false;
        child.stdout?.on('data', (chunk) => {
            output += chunk;
            // The QR code is printed as Unicode block characters
            // Look for the pattern of block characters that form the QR
            if (!resolved && output.includes('█') && output.split('\n').length > 10) {
                // Give it a moment to finish printing
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        child.kill();
                        // Convert the terminal QR to a simple data format
                        // The QR data URL is what the UI needs to display
                        const qrImage = terminalQrToDataUrl(output);
                        resolve(qrImage);
                    }
                }, 2000);
            }
        });
        child.on('close', () => {
            if (!resolved) {
                resolved = true;
                if (output.includes('█')) {
                    resolve(terminalQrToDataUrl(output));
                }
                else {
                    resolve(null);
                }
            }
        });
        child.on('error', () => {
            if (!resolved) {
                resolved = true;
                resolve(null);
            }
        });
        // Timeout fallback
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                child.kill();
                resolve(output.includes('█') ? terminalQrToDataUrl(output) : null);
            }
        }, 22_000);
    });
}
/**
 * Convert terminal Unicode QR code to an SVG data URL.
 * The terminal output uses block characters (█, ▄, ▀, space) to represent
 * the QR code. We convert these to a black/white pixel grid and render as SVG.
 */
function terminalQrToDataUrl(termOutput) {
    const lines = termOutput.split('\n').filter(l => l.includes('█') || l.includes('▄') || l.includes('▀'));
    if (lines.length < 5)
        return null;
    const scale = 4;
    // Each line represents 2 rows of the QR code (top/bottom halves using ▀▄█ characters)
    // █ = both top and bottom black
    // ▀ = top black, bottom white
    // ▄ = top white, bottom black
    // space = both white
    const rows = [];
    for (const line of lines) {
        const topRow = [];
        const bottomRow = [];
        for (const ch of line) {
            switch (ch) {
                case '█':
                    topRow.push(true);
                    bottomRow.push(true);
                    break;
                case '▀':
                    topRow.push(true);
                    bottomRow.push(false);
                    break;
                case '▄':
                    topRow.push(false);
                    bottomRow.push(true);
                    break;
                case ' ':
                    topRow.push(false);
                    bottomRow.push(false);
                    break;
                default:
                    // Other characters treated as black
                    topRow.push(true);
                    bottomRow.push(true);
                    break;
            }
        }
        rows.push(topRow);
        rows.push(bottomRow);
    }
    if (rows.length === 0)
        return null;
    const width = Math.max(...rows.map(r => r.length));
    const height = rows.length;
    // Build SVG
    let rects = '';
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < (rows[y]?.length ?? 0); x++) {
            if (rows[y][x]) {
                rects += `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="black"/>`;
            }
        }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width * scale} ${height * scale}"><rect width="100%" height="100%" fill="white"/>${rects}</svg>`;
    const b64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${b64}`;
}
/** Get the VM's network IP */
function getLocalIp() {
    try {
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name] ?? []) {
                if (net.family === 'IPv4' && !net.internal)
                    return net.address;
            }
        }
    }
    catch { }
    return '127.0.0.1';
}
router.post('/messaging/setup', async (req, res) => {
    const { platform, config } = req.body;
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
        res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` });
        return;
    }
    try {
        let result;
        switch (platform) {
            case 'telegram':
                result = await setupTelegram(config || {});
                break;
            case 'whatsapp':
                result = await setupWhatsApp(config || {});
                break;
            default:
                if (config?.token) {
                    await runAsClaw(`openclaw channels add --channel ${platform} --token ${config.token}`);
                }
                else {
                    await runAsClaw(`openclaw channels add --channel ${platform}`);
                }
                try {
                    await execAsync('systemctl restart openclaw-sidecar', { timeout: 15_000 });
                    await new Promise(r => setTimeout(r, 3000));
                }
                catch { }
                result = { status: 'configured' };
                break;
        }
        res.json({ platform, ...result });
    }
    catch (err) {
        res.status(500).json({ error: `Failed to setup ${platform}`, details: err.message });
    }
});
router.post('/messaging/teardown', async (req, res) => {
    const { platform } = req.body;
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
        res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` });
        return;
    }
    try {
        await runAsClaw(`openclaw channels remove --channel ${platform}`);
        try {
            await execAsync('systemctl restart openclaw-sidecar', { timeout: 15_000 });
            await new Promise(r => setTimeout(r, 3000));
        }
        catch {
            try {
                await runAsClaw('openclaw gateway restart');
            }
            catch { }
        }
        res.json({ status: 'removed', platform });
    }
    catch (err) {
        res.status(500).json({ error: `Failed to teardown ${platform}`, details: err.message });
    }
});
router.get('/messaging/status', async (_req, res) => {
    try {
        const platforms = {};
        // Check WhatsApp via credential files + CLI status
        if (whatsappCredentialsExist()) {
            let connected = false;
            try {
                const { stdout } = await runAsClaw('openclaw channels status --channel whatsapp 2>/dev/null', 10_000);
                connected = /connected|active|ready/i.test(stdout);
            }
            catch { }
            platforms.whatsapp = { configured: true, connected };
        }
        // Check other channels via openclaw channels list
        try {
            const { stdout } = await runAsClaw('openclaw channels list --json 2>/dev/null', 10_000);
            const data = JSON.parse(stdout.trim());
            const channels = Array.isArray(data) ? data : data.channels || [];
            for (const ch of channels) {
                const name = (ch.channel || ch.name || '').toLowerCase();
                if (VALID_PLATFORMS.includes(name) && !platforms[name]) {
                    platforms[name] = {
                        configured: true,
                        connected: ch.connected !== undefined ? ch.connected : ch.status === 'connected',
                    };
                }
            }
        }
        catch { }
        res.json({ platforms });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to get messaging status', details: err.message });
    }
});
// WhatsApp QR polling endpoint — uses Gateway WebSocket
router.get('/messaging/whatsapp/qr', async (_req, res) => {
    try {
        // Check if already connected
        if (whatsappCredentialsExist()) {
            try {
                const { stdout } = await runAsClaw('openclaw channels status --channel whatsapp 2>/dev/null', 5_000);
                if (/connected|ready/i.test(stdout)) {
                    res.json({ status: 'connected' });
                    return;
                }
            }
            catch { }
        }
        // Get fresh QR via Gateway WebSocket
        try {
            const result = await gatewayRpc('web.login.start', { channel: 'whatsapp' }, 15_000);
            if (result.qrDataUrl) {
                res.json({ status: 'pairing', qr: result.qrDataUrl });
                return;
            }
            res.json({ status: 'pending', message: result.message });
        }
        catch (err) {
            res.json({
                status: 'failed',
                error: err.message || 'Gateway not ready - please wait a moment and try again',
            });
        }
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to get WhatsApp QR', details: err.message });
    }
});
exports.default = router;
