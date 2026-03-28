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
exports.isThrottled = isThrottled;
const express_1 = require("express");
const usage_1 = require("./usage");
const router = (0, express_1.Router)();
let heartbeatInterval = null;
let usageReportInterval = null;
let portalUrl = null;
let vmId = null;
/** Whether the portal has indicated this assistant is throttled */
let throttled = false;
function isThrottled() {
    return throttled;
}
async function collectHealthData() {
    const os = await Promise.resolve().then(() => __importStar(require('os')));
    const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
    const execAsync = promisify(exec);
    let openclawRunning = false;
    try {
        await execAsync('pgrep -f openclaw');
        openclawRunning = true;
    }
    catch { }
    const total = os.totalmem();
    const free = os.freemem();
    return {
        uptime: process.uptime(),
        cpu: { cores: os.cpus().length, loadAvg: os.loadavg() },
        memory: {
            totalMB: Math.round(total / 1024 / 1024),
            freeMB: Math.round(free / 1024 / 1024),
            usedPercent: Math.round(((total - free) / total) * 100),
        },
        openclaw: { running: openclawRunning },
        timestamp: new Date().toISOString(),
    };
}
async function sendHeartbeat() {
    if (!portalUrl || !vmId)
        return;
    try {
        const health = await collectHealthData();
        let usage = { messages_sent: 0, hours_active: 0, api_tokens_used: 0 };
        try {
            usage = await (0, usage_1.getTodayUsageSummary)();
        }
        catch { }
        await fetch(`${portalUrl}/api/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vmId, ...health, usage }),
        });
    }
    catch (err) {
        console.error('[heartbeat] Failed to phone home:', err.message);
    }
}
/**
 * Report usage to the portal every 5 minutes.
 * The portal responds with { throttled } so the sidecar knows to pause.
 */
async function reportUsageToPortal() {
    if (!portalUrl || !vmId)
        return;
    const sidecarToken = process.env.SIDECAR_TOKEN;
    if (!sidecarToken)
        return;
    try {
        const usage = await (0, usage_1.getTodayUsageSummary)();
        const res = await fetch(`${portalUrl}/api/usage/record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sidecarToken}`,
            },
            body: JSON.stringify({
                assistant_id: vmId,
                messages_sent: usage.messages_sent,
                hours_active: usage.hours_active,
                api_tokens_used: usage.api_tokens_used,
            }),
        });
        if (res.ok) {
            const data = await res.json();
            throttled = data.throttled === true;
            if (throttled) {
                console.warn(`[usage] Throttled by portal: ${data.reason ?? 'limit reached'}`);
            }
        }
    }
    catch (err) {
        console.error('[usage] Failed to report usage:', err.message);
    }
}
router.post('/heartbeat/register', (req, res) => {
    const { url, id } = req.body;
    if (!url || !id) {
        res.status(400).json({ error: 'Missing url or id in body' });
        return;
    }
    portalUrl = url;
    vmId = id;
    // Clear existing intervals if re-registering
    if (heartbeatInterval)
        clearInterval(heartbeatInterval);
    if (usageReportInterval)
        clearInterval(usageReportInterval);
    // Send heartbeat immediately, then every 60s
    sendHeartbeat();
    heartbeatInterval = setInterval(sendHeartbeat, 60_000);
    // Report usage immediately, then every 5 minutes
    reportUsageToPortal();
    usageReportInterval = setInterval(reportUsageToPortal, 5 * 60 * 1000);
    res.json({ status: 'registered', portalUrl, vmId, heartbeatMs: 60_000, usageReportMs: 300_000 });
});
exports.default = router;
