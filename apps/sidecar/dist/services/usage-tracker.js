"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startUsageTracker = startUsageTracker;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const DEFAULT_LOG_DIRS = [
    (0, path_1.join)(process.env.HOME || '/home/claw', '.openclaw/agents/main/agent/logs'),
    '/home/claw/.openclaw/agents/main/agent/logs',
];
const SIDECAR_PORT = parseInt(process.env.PORT || '8787', 10);
const SIDECAR_TOKEN = process.env.SIDECAR_TOKEN || '';
// Match log lines indicating message activity (inbound or outbound)
// Typical OpenClaw log patterns for messages:
const MESSAGE_PATTERNS = [
    /\[inbound\]/i,
    /\[outbound\]/i,
    /\bmessage\s+(sent|received|delivered)\b/i,
    /\bhandleInbound\b/i,
    /\bhandleOutbound\b/i,
    /\b(telegram|whatsapp|discord|slack|signal)\b.*\b(send|recv|message)\b/i,
];
async function findLogFile() {
    const explicit = process.env.OPENCLAW_LOG_PATH;
    if (explicit) {
        if ((0, fs_1.existsSync)(explicit))
            return explicit;
        console.warn(`[usage-tracker] OPENCLAW_LOG_PATH=${explicit} not found`);
    }
    for (const dir of DEFAULT_LOG_DIRS) {
        if (!(0, fs_1.existsSync)(dir))
            continue;
        try {
            const files = await (0, promises_1.readdir)(dir);
            // Prefer agent.log, then any .log file
            if (files.includes('agent.log'))
                return (0, path_1.join)(dir, 'agent.log');
            const logFile = files.find((f) => f.endsWith('.log'));
            if (logFile)
                return (0, path_1.join)(dir, logFile);
        }
        catch {
            // skip
        }
    }
    return null;
}
async function incrementUsage(messages = 1) {
    try {
        const url = `http://127.0.0.1:${SIDECAR_PORT}/usage/increment`;
        const headers = { 'Content-Type': 'application/json' };
        if (SIDECAR_TOKEN) {
            headers['Authorization'] = `Bearer ${SIDECAR_TOKEN}`;
        }
        await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ messages }),
        });
    }
    catch (err) {
        // Non-fatal: usage tracking is best-effort
        console.warn('[usage-tracker] increment failed:', err.message);
    }
}
function isMessageLine(line) {
    return MESSAGE_PATTERNS.some((pat) => pat.test(line));
}
let running = false;
async function startUsageTracker() {
    if (running)
        return;
    const logFile = await findLogFile();
    if (!logFile) {
        console.warn('[usage-tracker] No OpenClaw log file found. Usage tracking disabled.');
        console.warn('[usage-tracker] Set OPENCLAW_LOG_PATH to enable.');
        return;
    }
    console.log(`[usage-tracker] Tailing ${logFile}`);
    running = true;
    const tail = (0, child_process_1.spawn)('tail', ['-F', '-n', '0', logFile], {
        stdio: ['ignore', 'pipe', 'ignore'],
    });
    let buffer = '';
    tail.stdout.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete line in buffer
        for (const line of lines) {
            if (line.trim() && isMessageLine(line)) {
                incrementUsage(1);
            }
        }
    });
    tail.on('exit', (code) => {
        console.warn(`[usage-tracker] tail exited with code ${code}, restarting in 5s...`);
        running = false;
        setTimeout(() => startUsageTracker(), 5000);
    });
    tail.on('error', (err) => {
        console.warn('[usage-tracker] tail error:', err.message);
        running = false;
        setTimeout(() => startUsageTracker(), 5000);
    });
}
