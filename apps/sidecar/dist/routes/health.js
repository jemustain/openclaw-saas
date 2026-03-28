"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const router = (0, express_1.Router)();
async function getDiskUsage() {
    try {
        const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $2,$3,$4,$5}'");
        const [total, used, available, usePercent] = stdout.trim().split(/\s+/);
        return { total, used, available, usePercent };
    }
    catch {
        return { total: 'unknown', used: 'unknown', available: 'unknown', usePercent: 'unknown' };
    }
}
async function getOpenclawVersion() {
    try {
        const { stdout } = await execAsync('openclaw --version');
        return stdout.trim();
    }
    catch {
        return 'unknown';
    }
}
async function isOpenclawRunning() {
    try {
        await execAsync('pgrep -f openclaw');
        return true;
    }
    catch {
        return false;
    }
}
function getCpuUsage() {
    const cpus = os_1.default.cpus();
    return {
        model: cpus[0]?.model || 'unknown',
        cores: cpus.length,
        loadAvg: os_1.default.loadavg(),
    };
}
function getMemoryUsage() {
    const total = os_1.default.totalmem();
    const free = os_1.default.freemem();
    const used = total - free;
    return {
        totalMB: Math.round(total / 1024 / 1024),
        freeMB: Math.round(free / 1024 / 1024),
        usedPercent: Math.round((used / total) * 100),
    };
}
router.get('/health', async (_req, res) => {
    const [disk, openclawVersion, openclawRunning] = await Promise.all([
        getDiskUsage(),
        getOpenclawVersion(),
        isOpenclawRunning(),
    ]);
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        cpu: getCpuUsage(),
        memory: getMemoryUsage(),
        disk,
        openclaw: {
            version: openclawVersion,
            running: openclawRunning,
        },
    });
});
exports.default = router;
