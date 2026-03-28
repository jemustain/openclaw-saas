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
        await execAsync('systemctl restart openclaw');
        const { stdout } = await execAsync('openclaw --version');
        res.json({ status: 'updated', version: stdout.trim() });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update openclaw', details: err.message });
    }
});
exports.default = router;
