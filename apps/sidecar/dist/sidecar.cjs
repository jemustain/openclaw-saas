"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_express7 = __toESM(require("express"));

// src/middleware/auth.ts
function authMiddleware(req, res, next) {
  const token = process.env.SIDECAR_TOKEN;
  if (!token) {
    res.status(500).json({ error: "SIDECAR_TOKEN not configured" });
    return;
  }
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// src/routes/health.ts
var import_express = require("express");
var import_os = __toESM(require("os"));
var import_child_process = require("child_process");
var import_util = require("util");
var import_crypto = require("crypto");
var import_fs = require("fs");
var import_path = require("path");
var execAsync = (0, import_util.promisify)(import_child_process.exec);
var router = (0, import_express.Router)();
var sidecarHash = "unknown";
try {
  const content = (0, import_fs.readFileSync)((0, import_path.resolve)(__dirname, "../sidecar.cjs"));
  sidecarHash = (0, import_crypto.createHash)("sha256").update(content).digest("hex").slice(0, 12);
} catch {
}
async function getDiskUsage() {
  try {
    const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $2,$3,$4,$5}'");
    const [total, used, available, usePercent] = stdout.trim().split(/\s+/);
    return { total, used, available, usePercent };
  } catch {
    return { total: "unknown", used: "unknown", available: "unknown", usePercent: "unknown" };
  }
}
async function getOpenclawVersion() {
  try {
    const { stdout } = await execAsync("openclaw --version");
    return stdout.trim();
  } catch {
    return "unknown";
  }
}
async function isOpenclawRunning() {
  try {
    await execAsync("pgrep -f openclaw");
    return true;
  } catch {
    return false;
  }
}
function getCpuUsage() {
  const cpus = import_os.default.cpus();
  return {
    model: cpus[0]?.model || "unknown",
    cores: cpus.length,
    loadAvg: import_os.default.loadavg()
  };
}
function getMemoryUsage() {
  const total = import_os.default.totalmem();
  const free = import_os.default.freemem();
  const used = total - free;
  return {
    totalMB: Math.round(total / 1024 / 1024),
    freeMB: Math.round(free / 1024 / 1024),
    usedPercent: Math.round(used / total * 100)
  };
}
router.get("/health", async (_req, res) => {
  const [disk, openclawVersion, openclawRunning] = await Promise.all([
    getDiskUsage(),
    getOpenclawVersion(),
    isOpenclawRunning()
  ]);
  res.json({
    status: "ok",
    uptime: process.uptime(),
    sidecarVersion: sidecarHash,
    cpu: getCpuUsage(),
    memory: getMemoryUsage(),
    disk,
    openclaw: {
      version: openclawVersion,
      running: openclawRunning
    }
  });
});
var health_default = router;

// src/routes/openclaw.ts
var import_express2 = require("express");
var import_child_process2 = require("child_process");
var import_util2 = require("util");
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var execAsync2 = (0, import_util2.promisify)(import_child_process2.exec);
var router2 = (0, import_express2.Router)();
var deviceFlowStore = {};
async function getOpenclawStatus() {
  let running2 = false;
  let version = "unknown";
  let uptime = "unknown";
  try {
    const { stdout } = await execAsync2("openclaw --version");
    version = stdout.trim();
  } catch {
  }
  try {
    await execAsync2("systemctl is-active openclaw");
    running2 = true;
  } catch {
    try {
      await execAsync2("pgrep -f openclaw");
      running2 = true;
    } catch {
    }
  }
  if (running2) {
    try {
      const { stdout } = await execAsync2("systemctl show openclaw --property=ActiveEnterTimestamp --value");
      uptime = stdout.trim() || "unknown";
    } catch {
    }
  }
  return { running: running2, version, uptime };
}
router2.get("/openclaw/status", async (_req, res) => {
  const status = await getOpenclawStatus();
  res.json(status);
});
router2.post("/openclaw/restart", async (_req, res) => {
  try {
    await execAsync2("systemctl restart openclaw");
    res.json({ status: "restarted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to restart openclaw", details: err.message });
  }
});
router2.post("/openclaw/update", async (_req, res) => {
  try {
    await execAsync2("npm install -g openclaw@latest");
    try {
      await execAsync2("systemctl restart openclaw-sidecar");
    } catch {
      try {
        await execAsync2("systemctl restart openclaw");
      } catch {
      }
    }
    const { stdout } = await execAsync2("openclaw --version");
    res.json({ status: "updated", version: stdout.trim() });
  } catch (err) {
    res.status(500).json({ error: "Failed to update openclaw", details: err.message });
  }
});
router2.post("/admin/update-sidecar", async (_req, res) => {
  try {
    const url = "https://raw.githubusercontent.com/jemustain/openclaw-saas/main/apps/sidecar/dist/sidecar.cjs";
    await execAsync2(`curl -sf -L "${url}" -o /opt/shiftworker/sidecar/dist/sidecar.cjs`, { timeout: 3e4 });
    try {
      await execAsync2("systemctl restart shiftworker-sidecar", { timeout: 1e4 });
    } catch {
    }
    res.json({ status: "updated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update sidecar", details: err.message });
  }
});
router2.post("/admin/fix-config", async (_req, res) => {
  try {
    const CLAW_USER2 = process.env.OPENCLAW_USER || "claw";
    const configPath = `/home/${CLAW_USER2}/.openclaw/openclaw.json`;
    const fs2 = require("fs");
    if (!fs2.existsSync(configPath)) {
      res.json({ status: "no_config" });
      return;
    }
    const config = JSON.parse(fs2.readFileSync(configPath, "utf8"));
    let fixed = false;
    if (config.channels?.telegram?.dmPolicy === "open") {
      if (!config.channels.telegram.allowFrom || !config.channels.telegram.allowFrom.includes("*")) {
        config.channels.telegram.allowFrom = ["*"];
        fixed = true;
      }
    }
    if (fixed) {
      fs2.writeFileSync(configPath, JSON.stringify(config, null, 2));
      await execAsync2(`chown ${CLAW_USER2}:${CLAW_USER2} ${configPath}`);
    }
    res.json({ status: fixed ? "fixed" : "ok", fixed });
  } catch (err) {
    res.status(500).json({ error: "Failed to fix config", details: err.message });
  }
});
var COPILOT_CLIENT_ID = "Iv1.b507a08c87ecfe98";
router2.post("/openclaw/github-copilot-device-start", async (_req, res) => {
  try {
    const ghRes = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: COPILOT_CLIENT_ID, scope: "read:user" })
    });
    if (!ghRes.ok) {
      const text = await ghRes.text();
      res.status(502).json({ error: "GitHub device code request failed", details: text });
      return;
    }
    const data = await ghRes.json();
    const { device_code, user_code, verification_uri, expires_in, interval } = data;
    deviceFlowStore["copilot-device"] = {
      deviceCode: device_code,
      expiresAt: Date.now() + (expires_in ?? 900) * 1e3,
      interval: interval ?? 5
    };
    res.json({
      userCode: user_code,
      verificationUri: verification_uri,
      deviceCode: device_code,
      expiresIn: expires_in,
      interval: interval ?? 5
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to start device flow", details: err.message });
  }
});
router2.get("/openclaw/github-copilot-device-status", async (_req, res) => {
  try {
    const stored = deviceFlowStore["copilot-device"];
    if (!stored) {
      const CLAW_USER2 = process.env.OPENCLAW_USER || "claw";
      const agentAuthPath = path.join("/home", CLAW_USER2, ".openclaw", "agents", "main", "agent", "auth-profiles.json");
      if (fs.existsSync(agentAuthPath)) {
        try {
          const profiles = JSON.parse(fs.readFileSync(agentAuthPath, "utf8"));
          if (profiles?.profiles?.["github-copilot:github"]?.token) {
            res.json({ status: "authorized", model: "github-copilot/claude-opus-4.6" });
            return;
          }
        } catch {
        }
      }
      res.json({ status: "error", error: "No device flow in progress. Call device-start first." });
      return;
    }
    if (Date.now() > stored.expiresAt) {
      delete deviceFlowStore["copilot-device"];
      res.json({ status: "expired" });
      return;
    }
    const ghRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: COPILOT_CLIENT_ID,
        device_code: stored.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code"
      })
    });
    const data = await ghRes.json();
    if (data.error === "authorization_pending") {
      res.json({ status: "pending" });
      return;
    }
    if (data.error === "slow_down") {
      stored.interval = (stored.interval ?? 5) + 5;
      res.json({ status: "pending" });
      return;
    }
    if (data.error === "expired_token") {
      delete deviceFlowStore["copilot-device"];
      res.json({ status: "expired" });
      return;
    }
    if (data.error) {
      delete deviceFlowStore["copilot-device"];
      res.json({ status: "error", error: data.error_description || data.error });
      return;
    }
    if (data.access_token) {
      delete deviceFlowStore["copilot-device"];
      const token = data.access_token;
      const CLAW_USER2 = process.env.OPENCLAW_USER || "claw";
      const agentDir = path.join("/home", CLAW_USER2, ".openclaw", "agents", "main", "agent");
      const stateDir = path.join("/home", CLAW_USER2, ".openclaw", "state");
      const agentAuthPath = path.join(agentDir, "auth-profiles.json");
      const stateAuthPath = path.join(stateDir, "auth-profiles.json");
      for (const dir of [agentDir, stateDir]) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
      let profiles = { profiles: {} };
      if (fs.existsSync(agentAuthPath)) {
        try {
          profiles = JSON.parse(fs.readFileSync(agentAuthPath, "utf8"));
        } catch {
        }
      } else if (fs.existsSync(stateAuthPath)) {
        try {
          profiles = JSON.parse(fs.readFileSync(stateAuthPath, "utf8"));
        } catch {
        }
      }
      profiles.profiles = profiles.profiles ?? {};
      profiles.profiles["github-copilot:github"] = {
        type: "token",
        provider: "github-copilot",
        token
      };
      for (const authPath of [agentAuthPath, stateAuthPath]) {
        fs.writeFileSync(authPath, JSON.stringify(profiles, null, 2));
      }
      try {
        await execAsync2(`chown -R ${CLAW_USER2}:${CLAW_USER2} ${agentDir}`);
      } catch {
      }
      try {
        await execAsync2(`chown -R ${CLAW_USER2}:${CLAW_USER2} ${stateDir}`);
      } catch {
      }
      const configPath = path.join("/home", CLAW_USER2, ".openclaw", "openclaw.json");
      let config = {};
      if (fs.existsSync(configPath)) {
        try {
          config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        } catch {
        }
      }
      const agents = config.agents = config.agents ?? {};
      const defaults = agents.defaults = agents.defaults ?? {};
      defaults.model = { primary: "github-copilot/claude-opus-4.6" };
      delete config.defaultModel;
      if (config.env) {
        delete config.env["OPENAI_API_KEY"];
        delete config.env["OPENAI_BASE_URL"];
        delete config.env["GITHUB_TOKEN"];
        if (Object.keys(config.env).length === 0) delete config.env;
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      try {
        await execAsync2(`chown ${CLAW_USER2}:${CLAW_USER2} ${configPath}`);
      } catch {
      }
      const configEnvPath = path.join("/home", CLAW_USER2, ".openclaw", "config.env");
      if (fs.existsSync(configEnvPath)) {
        try {
          let envContent = fs.readFileSync(configEnvPath, "utf8");
          envContent = envContent.split("\n").filter((line) => !line.startsWith("OPENAI_API_KEY=") && !line.startsWith("OPENAI_BASE_URL=") && !line.startsWith("GITHUB_TOKEN=")).join("\n");
          fs.writeFileSync(configEnvPath, envContent);
          try {
            await execAsync2(`chown ${CLAW_USER2}:${CLAW_USER2} ${configEnvPath}`);
          } catch {
          }
        } catch {
        }
      }
      try {
        await execAsync2("systemctl restart openclaw-sidecar");
      } catch {
        try {
          await execAsync2(`su - ${CLAW_USER2} -c "openclaw gateway restart"`);
        } catch {
        }
      }
      res.json({ status: "authorized", model: "github-copilot/claude-opus-4.6" });
      return;
    }
    res.json({ status: "error", error: "Unexpected response from GitHub" });
  } catch (err) {
    res.status(500).json({ error: "Failed to check device flow status", details: err.message });
  }
});
router2.post("/openclaw/configure-model", async (req, res) => {
  try {
    const { provider, apiKey } = req.body ?? {};
    if (!provider) {
      res.status(400).json({ error: "Missing provider" });
      return;
    }
    const CLAW_USER2 = process.env.OPENCLAW_USER || "claw";
    const configPath = `/home/${CLAW_USER2}/.openclaw/openclaw.json`;
    const fs2 = require("fs");
    let config = {};
    if (fs2.existsSync(configPath)) {
      config = JSON.parse(fs2.readFileSync(configPath, "utf8"));
    }
    const MODEL_MAP = {
      "gemini": "gemini/gemini-2.5-flash",
      "openai": "openai/gpt-4o",
      "anthropic": "anthropic/claude-sonnet-4",
      "github-copilot": "openai/gpt-4o"
    };
    const modelId = MODEL_MAP[provider];
    if (!modelId) {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }
    const agents = config.agents = config.agents ?? {};
    const defaults = agents.defaults = agents.defaults ?? {};
    defaults.model = { primary: modelId };
    delete config.defaultModel;
    const ENV_MAP = {
      "gemini": "GEMINI_API_KEY",
      "openai": "OPENAI_API_KEY",
      "anthropic": "ANTHROPIC_API_KEY",
      "github-copilot": "OPENAI_API_KEY"
    };
    if (apiKey) {
      const envKey = ENV_MAP[provider];
      if (envKey) {
        config.env = config.env ?? {};
        config.env[envKey] = apiKey;
      }
    }
    if (provider === "github-copilot") {
      config.env = config.env ?? {};
      config.env["OPENAI_BASE_URL"] = "https://models.inference.ai.azure.com";
      delete config.env["GITHUB_TOKEN"];
    }
    fs2.writeFileSync(configPath, JSON.stringify(config, null, 2));
    await execAsync2(`chown ${CLAW_USER2}:${CLAW_USER2} ${configPath}`);
    try {
      await execAsync2("systemctl restart openclaw-sidecar");
    } catch {
      try {
        await execAsync2(`su - ${CLAW_USER2} -c "openclaw gateway restart"`);
      } catch {
      }
    }
    res.json({ status: "configured", model: modelId });
  } catch (err) {
    res.status(500).json({ error: "Failed to configure model", details: err.message });
  }
});
var openclaw_default = router2;

// src/routes/heartbeat.ts
var import_express4 = require("express");

// src/routes/usage.ts
var import_express3 = require("express");
var import_promises = require("fs/promises");
var import_path2 = require("path");
var router3 = (0, import_express3.Router)();
var USAGE_FILE = process.env.USAGE_FILE || "/var/lib/shiftworker/usage.json";
function todayKey() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
async function readUsageStore() {
  try {
    const raw = await (0, import_promises.readFile)(USAGE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
async function writeUsageStore(store) {
  await (0, import_promises.mkdir)((0, import_path2.dirname)(USAGE_FILE), { recursive: true });
  await (0, import_promises.writeFile)(USAGE_FILE, JSON.stringify(store, null, 2), "utf-8");
}
function getOrCreateToday(store) {
  const key = todayKey();
  if (!store[key]) {
    store[key] = {
      date: key,
      messages_sent: 0,
      active_minutes: 0,
      api_tokens_used: 0,
      last_activity: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  return store[key];
}
router3.post("/usage/increment", async (req, res) => {
  const { messages = 1, tokens = 0 } = req.body || {};
  try {
    const store = await readUsageStore();
    const today = getOrCreateToday(store);
    today.messages_sent += typeof messages === "number" ? messages : 1;
    today.api_tokens_used += typeof tokens === "number" ? tokens : 0;
    const now = /* @__PURE__ */ new Date();
    const lastActivity = new Date(today.last_activity);
    const gapMinutes = (now.getTime() - lastActivity.getTime()) / 6e4;
    if (gapMinutes > 0 && gapMinutes <= 5) {
      today.active_minutes += gapMinutes;
    } else if (gapMinutes > 5) {
      today.active_minutes += 1;
    }
    today.last_activity = now.toISOString();
    await writeUsageStore(store);
    res.json({ status: "ok", today });
  } catch (err) {
    res.status(500).json({ error: "Failed to increment usage", details: err.message });
  }
});
router3.get("/usage/today", async (_req, res) => {
  try {
    const store = await readUsageStore();
    const key = todayKey();
    const today = store[key] || {
      date: key,
      messages_sent: 0,
      active_minutes: 0,
      api_tokens_used: 0,
      last_activity: null
    };
    res.json({
      messages_sent: today.messages_sent,
      hours_active: Math.round(today.active_minutes / 60 * 100) / 100,
      api_tokens_used: today.api_tokens_used
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to read usage", details: err.message });
  }
});
async function getTodayUsageSummary() {
  const store = await readUsageStore();
  const today = store[todayKey()];
  if (!today) return { messages_sent: 0, hours_active: 0, api_tokens_used: 0 };
  return {
    messages_sent: today.messages_sent,
    hours_active: Math.round(today.active_minutes / 60 * 100) / 100,
    api_tokens_used: today.api_tokens_used
  };
}
var usage_default = router3;

// src/routes/heartbeat.ts
var router4 = (0, import_express4.Router)();
var heartbeatInterval = null;
var usageReportInterval = null;
var portalUrl = null;
var vmId = null;
var throttled = false;
async function collectHealthData() {
  const os2 = await import("os");
  const { exec: exec5 } = await import("child_process");
  const { promisify: promisify5 } = await import("util");
  const execAsync5 = promisify5(exec5);
  let openclawRunning = false;
  try {
    await execAsync5("pgrep -f openclaw");
    openclawRunning = true;
  } catch {
  }
  const total = os2.totalmem();
  const free = os2.freemem();
  return {
    uptime: process.uptime(),
    cpu: { cores: os2.cpus().length, loadAvg: os2.loadavg() },
    memory: {
      totalMB: Math.round(total / 1024 / 1024),
      freeMB: Math.round(free / 1024 / 1024),
      usedPercent: Math.round((total - free) / total * 100)
    },
    openclaw: { running: openclawRunning },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function sendHeartbeat() {
  if (!portalUrl || !vmId) return;
  try {
    const health = await collectHealthData();
    let usage = { messages_sent: 0, hours_active: 0, api_tokens_used: 0 };
    try {
      usage = await getTodayUsageSummary();
    } catch {
    }
    await fetch(`${portalUrl}/api/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vmId, ...health, usage })
    });
  } catch (err) {
    console.error("[heartbeat] Failed to phone home:", err.message);
  }
}
async function reportUsageToPortal() {
  if (!portalUrl || !vmId) return;
  const sidecarToken = process.env.SIDECAR_TOKEN;
  if (!sidecarToken) return;
  try {
    const usage = await getTodayUsageSummary();
    const res = await fetch(`${portalUrl}/api/usage/record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sidecarToken}`
      },
      body: JSON.stringify({
        assistant_id: vmId,
        messages_sent: usage.messages_sent,
        hours_active: usage.hours_active,
        api_tokens_used: usage.api_tokens_used
      })
    });
    if (res.ok) {
      const data = await res.json();
      throttled = data.throttled === true;
      if (throttled) {
        console.warn(`[usage] Throttled by portal: ${data.reason ?? "limit reached"}`);
      }
    }
  } catch (err) {
    console.error("[usage] Failed to report usage:", err.message);
  }
}
router4.post("/heartbeat/register", (req, res) => {
  const { url, id } = req.body;
  if (!url || !id) {
    res.status(400).json({ error: "Missing url or id in body" });
    return;
  }
  portalUrl = url;
  vmId = id;
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (usageReportInterval) clearInterval(usageReportInterval);
  sendHeartbeat();
  heartbeatInterval = setInterval(sendHeartbeat, 6e4);
  reportUsageToPortal();
  usageReportInterval = setInterval(reportUsageToPortal, 5 * 60 * 1e3);
  res.json({ status: "registered", portalUrl, vmId, heartbeatMs: 6e4, usageReportMs: 3e5 });
});
var heartbeat_default = router4;

// src/routes/skills.ts
var import_express5 = require("express");
var import_child_process3 = require("child_process");
var import_util3 = require("util");
var import_promises2 = require("fs/promises");
var import_path3 = require("path");
var execAsync3 = (0, import_util3.promisify)(import_child_process3.exec);
var router5 = (0, import_express5.Router)();
var SKILLS_DIRS = [
  "/usr/local/lib/node_modules/openclaw/skills",
  (0, import_path3.join)(process.env.HOME || "/root", ".openclaw/workspace/skills"),
  (0, import_path3.join)(process.env.HOME || "/root", ".agents/skills")
];
router5.get("/skills", async (_req, res) => {
  try {
    try {
      const { stdout } = await execAsync3("openclaw skill list --json 2>/dev/null || openclaw skill list 2>/dev/null");
      if (stdout.trim()) {
        try {
          const skills2 = JSON.parse(stdout.trim());
          res.json({ skills: skills2 });
          return;
        } catch {
          const skills2 = stdout.trim().split("\n").filter(Boolean).map((name) => ({ name: name.trim() }));
          res.json({ skills: skills2 });
          return;
        }
      }
    } catch {
    }
    const skills = [];
    for (const dir of SKILLS_DIRS) {
      try {
        const entries = await (0, import_promises2.readdir)(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            skills.push({ name: entry.name, path: (0, import_path3.join)(dir, entry.name) });
          }
        }
      } catch {
      }
    }
    res.json({ skills });
  } catch (err) {
    res.status(500).json({ error: "Failed to list skills", details: err.message });
  }
});
router5.post("/skills/install", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Missing or invalid skill name" });
    return;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    res.status(400).json({ error: "Invalid skill name format" });
    return;
  }
  try {
    const { stdout, stderr } = await execAsync3(`openclaw skill install ${name}`, { timeout: 6e4 });
    res.json({ status: "installed", name, output: stdout.trim() || stderr.trim() });
  } catch (err) {
    res.status(500).json({ error: "Failed to install skill", details: err.stderr || err.message });
  }
});
router5.post("/skills/remove", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Missing or invalid skill name" });
    return;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    res.status(400).json({ error: "Invalid skill name format" });
    return;
  }
  try {
    const { stdout, stderr } = await execAsync3(`openclaw skill remove ${name}`, { timeout: 3e4 });
    res.json({ status: "removed", name, output: stdout.trim() || stderr.trim() });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove skill", details: err.stderr || err.message });
  }
});
var skills_default = router5;

// src/routes/messaging.ts
var import_express6 = require("express");
var import_child_process4 = require("child_process");
var import_util4 = require("util");
var import_fs2 = require("fs");
var import_ws = __toESM(require("ws"));
var import_pino = __toESM(require("pino"));
var makeWASocket = require("@whiskeysockets/baileys").default;
var { useMultiFileAuthState, fetchLatestBaileysVersion } = (
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("@whiskeysockets/baileys")
);
var execAsync4 = (0, import_util4.promisify)(import_child_process4.exec);
var router6 = (0, import_express6.Router)();
var VALID_PLATFORMS = ["whatsapp", "telegram", "signal", "discord", "slack"];
var CLAW_USER = process.env.OPENCLAW_USER || "claw";
var CLAW_HOME = process.env.OPENCLAW_HOME || `/home/${CLAW_USER}`;
var GATEWAY_WS_URL = process.env.GATEWAY_WS_URL || "ws://127.0.0.1:18789";
async function runAsClaw(cmd, timeoutMs = 3e4) {
  return new Promise((resolve2, reject) => {
    const child = (0, import_child_process4.exec)(`su - ${CLAW_USER} -c '${cmd.replace(/'/g, "'\\''")}'`, { timeout: timeoutMs, killSignal: "SIGKILL" }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve2({ stdout, stderr });
    });
    const forceTimer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
      }
    }, timeoutMs + 5e3);
    child.on("exit", () => clearTimeout(forceTimer));
  });
}
function getGatewayToken() {
  try {
    const configPath = `${CLAW_HOME}/.openclaw/openclaw.json`;
    if (!(0, import_fs2.existsSync)(configPath)) return void 0;
    const config = JSON.parse(require("fs").readFileSync(configPath, "utf8"));
    return config?.gateway?.controlUi?.token || config?.gateway?.auth?.token || config?.["gateway.controlUi.token"] || config?.["gateway.auth.token"];
  } catch {
    return void 0;
  }
}
async function gatewayRpc(method, params = {}, timeoutMs = 3e4) {
  return new Promise((resolve2, reject) => {
    const token = getGatewayToken();
    const wsUrl = token ? `${GATEWAY_WS_URL}?token=${encodeURIComponent(token)}` : GATEWAY_WS_URL;
    const ws = new import_ws.default(wsUrl);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Gateway RPC timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Gateway not ready - please wait a moment and try again (${err.message})`));
    });
    ws.on("open", () => {
      const id = Date.now().toString();
      ws.send(JSON.stringify({ id, method, params }));
      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.id === id) {
            clearTimeout(timer);
            ws.close();
            if (msg.error) {
              reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              resolve2(msg.result);
            }
          }
        } catch {
        }
      });
    });
    ws.on("close", () => {
      clearTimeout(timer);
    });
  });
}
function whatsappCredentialsExist() {
  const credPath = `${CLAW_HOME}/.openclaw/credentials/whatsapp`;
  return (0, import_fs2.existsSync)(credPath);
}
async function setupTelegram(config) {
  if (!config.botToken || typeof config.botToken !== "string") {
    throw new Error("Missing botToken for Telegram setup");
  }
  try {
    const configPath = `${CLAW_HOME}/.openclaw/openclaw.json`;
    const fs2 = require("fs");
    const config_data = fs2.existsSync(configPath) ? JSON.parse(fs2.readFileSync(configPath, "utf8")) : {};
    const channels = config_data.channels = config_data.channels || {};
    const tg = channels.telegram = channels.telegram || {};
    tg.dmPolicy = "open";
    tg.allowFrom = ["*"];
    fs2.writeFileSync(configPath, JSON.stringify(config_data, null, 2));
    const { execSync } = require("child_process");
    execSync(`chown ${CLAW_USER}:${CLAW_USER} ${configPath}`);
  } catch (err) {
    console.error("Failed to pre-configure Telegram:", err.message);
  }
  await runAsClaw(`openclaw channels add --channel telegram --token ${config.botToken}`);
  try {
    await execAsync4("systemctl restart openclaw-sidecar", { timeout: 15e3 });
    await new Promise((r) => setTimeout(r, 5e3));
  } catch {
    try {
      await runAsClaw("openclaw gateway restart");
    } catch {
    }
  }
  try {
    const { stdout } = await runAsClaw("openclaw channels list --json 2>/dev/null", 1e4);
    const data = JSON.parse(stdout.trim());
    const channels = Array.isArray(data) ? data : data.channels || [];
    const hasTelegram = channels.some((ch) => (ch.channel || ch.name || "").toLowerCase() === "telegram");
    if (!hasTelegram) {
      console.warn("Telegram channel not found after setup, retrying...");
      await runAsClaw(`openclaw channels add --channel telegram --token ${config.botToken}`);
      try {
        await execAsync4("systemctl restart openclaw-sidecar", { timeout: 15e3 });
      } catch {
      }
      await new Promise((r) => setTimeout(r, 5e3));
    }
  } catch {
  }
  autoApproveFirstPairing("telegram", 10 * 6e4);
  return { status: "configured" };
}
function autoApproveFirstPairing(channel, windowMs) {
  const deadline = Date.now() + windowMs;
  const poll = async () => {
    if (Date.now() > deadline) return;
    try {
      const { stdout } = await runAsClaw(
        `openclaw pairing list ${channel} --json 2>/dev/null`,
        1e4
      );
      const requests = JSON.parse(stdout.trim() || "[]");
      if (Array.isArray(requests) && requests.length > 0) {
        const code = requests[0].code ?? requests[0].pairingCode;
        if (code) {
          await runAsClaw(`openclaw pairing approve ${channel} ${code}`, 1e4);
          console.log(`[auto-pair] Approved ${channel} pairing code ${code}`);
          return;
        }
      }
    } catch {
    }
    setTimeout(poll, 5e3);
  };
  setTimeout(poll, 3e3);
}
async function requestWhatsAppPairingCode(phoneNumber) {
  const authDir = `${CLAW_HOME}/.openclaw/credentials/whatsapp`;
  if (!(0, import_fs2.existsSync)(authDir)) {
    (0, import_fs2.mkdirSync)(authDir, { recursive: true });
    try {
      await execAsync4(`chown -R ${CLAW_USER}:${CLAW_USER} ${authDir}`);
    } catch {
    }
  }
  try {
    await runAsClaw("openclaw gateway stop --channel whatsapp 2>/dev/null", 1e4);
  } catch {
  }
  try {
    await gatewayRpc("web.login.start", { channel: "whatsapp", force: true }, 5e3);
  } catch {
  }
  await new Promise((r) => setTimeout(r, 2e3));
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: (0, import_pino.default)({ level: "silent" })
  });
  sock.ev.on("creds.update", saveCreds);
  return new Promise((resolve2) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          sock.end(void 0);
        } catch {
        }
        resolve2({ error: "Timed out waiting for pairing code" });
      }
    }, 6e4);
    sock.ev.on("connection.update", async (update) => {
      const { connection, qr } = update;
      if (qr && !resolved) {
        try {
          const digits = phoneNumber.replace(/[^0-9]/g, "");
          const code = await sock.requestPairingCode(digits);
          resolved = true;
          clearTimeout(timeout);
          resolve2({ pairingCode: code });
        } catch (err) {
          resolved = true;
          clearTimeout(timeout);
          try {
            sock.end(void 0);
          } catch {
          }
          resolve2({ error: err.message || "Failed to request pairing code" });
        }
      }
      if (connection === "open") {
        try {
          await runAsClaw("openclaw gateway restart");
        } catch {
        }
      }
      if (connection === "close") {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve2({ error: "Connection closed before pairing code was issued" });
        }
      }
    });
  });
}
async function setupWhatsApp(config) {
  if (config.method === "pairing-code" && typeof config.phoneNumber === "string") {
    const result = await requestWhatsAppPairingCode(config.phoneNumber);
    if (result.pairingCode) {
      return { platform: "whatsapp", status: "pairing", pairingCode: result.pairingCode };
    }
    return { platform: "whatsapp", status: "error", error: result.error || "Failed to get pairing code" };
  }
  if (whatsappCredentialsExist()) {
    try {
      const { stdout } = await runAsClaw("openclaw channels status --channel whatsapp 2>/dev/null", 1e4);
      if (stdout.toLowerCase().includes("connected") || stdout.toLowerCase().includes("active") || stdout.toLowerCase().includes("ready")) {
        return { platform: "whatsapp", status: "connected" };
      }
    } catch {
    }
  }
  try {
    await runAsClaw("openclaw channels add --channel whatsapp 2>/dev/null", 1e4);
  } catch {
  }
  try {
    const qrData = await captureWhatsAppQr();
    if (qrData) {
      return { platform: "whatsapp", status: "pairing", qr: qrData };
    }
  } catch (err) {
    console.error("WhatsApp QR capture failed:", err.message);
  }
  let gatewayToken = "";
  try {
    const { stdout } = await runAsClaw(`cat ${CLAW_HOME}/.openclaw/openclaw.json`, 5e3);
    const config2 = JSON.parse(stdout.trim());
    gatewayToken = config2?.gateway?.auth?.token ?? "";
  } catch {
  }
  const controlUiUrl = `http://${getLocalIp()}:8787${gatewayToken ? `/#token=${gatewayToken}` : ""}`;
  return { platform: "whatsapp", status: "pairing", controlUiUrl };
}
async function captureWhatsAppQr() {
  return new Promise((resolve2) => {
    const child = (0, import_child_process4.exec)(
      `su - ${CLAW_USER} -c 'openclaw channels login --channel whatsapp 2>&1'`,
      { timeout: 45e3 }
    );
    let output = "";
    let resolved = false;
    child.stdout?.on("data", (chunk) => {
      output += chunk;
      if (!resolved && output.includes("\u2588") && output.split("\n").length > 10) {
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            child.kill();
            const qrImage = terminalQrToDataUrl(output);
            resolve2(qrImage);
          }
        }, 2e3);
      }
    });
    child.on("close", () => {
      if (!resolved) {
        resolved = true;
        if (output.includes("\u2588")) {
          resolve2(terminalQrToDataUrl(output));
        } else {
          resolve2(null);
        }
      }
    });
    child.on("error", () => {
      if (!resolved) {
        resolved = true;
        resolve2(null);
      }
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill();
        resolve2(output.includes("\u2588") ? terminalQrToDataUrl(output) : null);
      }
    }, 22e3);
  });
}
function terminalQrToDataUrl(termOutput) {
  const lines = termOutput.split("\n").filter((l) => l.includes("\u2588") || l.includes("\u2584") || l.includes("\u2580"));
  if (lines.length < 5) return null;
  const scale = 4;
  const rows = [];
  for (const line of lines) {
    const topRow = [];
    const bottomRow = [];
    for (const ch of line) {
      switch (ch) {
        case "\u2588":
          topRow.push(true);
          bottomRow.push(true);
          break;
        case "\u2580":
          topRow.push(true);
          bottomRow.push(false);
          break;
        case "\u2584":
          topRow.push(false);
          bottomRow.push(true);
          break;
        case " ":
          topRow.push(false);
          bottomRow.push(false);
          break;
        default:
          topRow.push(true);
          bottomRow.push(true);
          break;
      }
    }
    rows.push(topRow);
    rows.push(bottomRow);
  }
  if (rows.length === 0) return null;
  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;
  let rects = "";
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < (rows[y]?.length ?? 0); x++) {
      if (rows[y][x]) {
        rects += `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="black"/>`;
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width * scale} ${height * scale}"><rect width="100%" height="100%" fill="white"/>${rects}</svg>`;
  const b64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}
function getLocalIp() {
  try {
    const { networkInterfaces } = require("os");
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === "IPv4" && !net.internal) return net.address;
      }
    }
  } catch {
  }
  return "127.0.0.1";
}
router6.post("/messaging/setup", async (req, res) => {
  const { platform, config } = req.body;
  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}` });
    return;
  }
  try {
    let result;
    switch (platform) {
      case "telegram":
        result = await setupTelegram(config || {});
        break;
      case "whatsapp":
        result = await setupWhatsApp(config || {});
        break;
      default:
        if (config?.token) {
          await runAsClaw(`openclaw channels add --channel ${platform} --token ${config.token}`);
        } else {
          await runAsClaw(`openclaw channels add --channel ${platform}`);
        }
        try {
          await execAsync4("systemctl restart openclaw-sidecar", { timeout: 15e3 });
          await new Promise((r) => setTimeout(r, 3e3));
        } catch {
        }
        result = { status: "configured" };
        break;
    }
    res.json({ platform, ...result });
  } catch (err) {
    res.status(500).json({ error: `Failed to setup ${platform}`, details: err.message });
  }
});
router6.post("/messaging/teardown", async (req, res) => {
  const { platform } = req.body;
  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}` });
    return;
  }
  try {
    await runAsClaw(`openclaw channels remove --channel ${platform}`);
    try {
      await execAsync4("systemctl restart openclaw-sidecar", { timeout: 15e3 });
      await new Promise((r) => setTimeout(r, 3e3));
    } catch {
      try {
        await runAsClaw("openclaw gateway restart");
      } catch {
      }
    }
    res.json({ status: "removed", platform });
  } catch (err) {
    res.status(500).json({ error: `Failed to teardown ${platform}`, details: err.message });
  }
});
router6.get("/messaging/status", async (_req, res) => {
  try {
    const platforms = {};
    if (whatsappCredentialsExist()) {
      let connected = false;
      try {
        const { stdout } = await runAsClaw("openclaw channels status --channel whatsapp 2>/dev/null", 1e4);
        connected = /connected|active|ready/i.test(stdout);
      } catch {
      }
      platforms.whatsapp = { configured: true, connected };
    }
    try {
      const { stdout } = await runAsClaw("openclaw channels list --json 2>/dev/null", 1e4);
      const data = JSON.parse(stdout.trim());
      const channels = Array.isArray(data) ? data : data.channels || [];
      for (const ch of channels) {
        const name = (ch.channel || ch.name || "").toLowerCase();
        if (VALID_PLATFORMS.includes(name) && !platforms[name]) {
          platforms[name] = {
            configured: true,
            connected: ch.connected !== void 0 ? ch.connected : ch.status === "connected"
          };
        }
      }
    } catch {
    }
    res.json({ platforms });
  } catch (err) {
    res.status(500).json({ error: "Failed to get messaging status", details: err.message });
  }
});
router6.get("/messaging/whatsapp/qr", async (_req, res) => {
  try {
    if (whatsappCredentialsExist()) {
      try {
        const { stdout } = await runAsClaw("openclaw channels status --channel whatsapp 2>/dev/null", 5e3);
        if (/connected|ready/i.test(stdout)) {
          res.json({ status: "connected" });
          return;
        }
      } catch {
      }
    }
    try {
      const result = await gatewayRpc(
        "web.login.start",
        { channel: "whatsapp" },
        15e3
      );
      if (result.qrDataUrl) {
        res.json({ status: "pairing", qr: result.qrDataUrl });
        return;
      }
      res.json({ status: "pending", message: result.message });
    } catch (err) {
      res.json({
        status: "failed",
        error: err.message || "Gateway not ready - please wait a moment and try again"
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to get WhatsApp QR", details: err.message });
  }
});
var messaging_default = router6;

// src/services/usage-tracker.ts
var import_child_process5 = require("child_process");
var import_fs3 = require("fs");
var import_promises3 = require("fs/promises");
var import_path4 = require("path");
var DEFAULT_LOG_DIRS = [
  (0, import_path4.join)(process.env.HOME || "/home/claw", ".openclaw/agents/main/agent/logs"),
  "/home/claw/.openclaw/agents/main/agent/logs"
];
var SIDECAR_PORT = parseInt(process.env.PORT || "8787", 10);
var SIDECAR_TOKEN = process.env.SIDECAR_TOKEN || "";
var MESSAGE_PATTERNS = [
  /\[inbound\]/i,
  /\[outbound\]/i,
  /\bmessage\s+(sent|received|delivered)\b/i,
  /\bhandleInbound\b/i,
  /\bhandleOutbound\b/i,
  /\b(telegram|whatsapp|discord|slack|signal)\b.*\b(send|recv|message)\b/i
];
async function findLogFile() {
  const explicit = process.env.OPENCLAW_LOG_PATH;
  if (explicit) {
    if ((0, import_fs3.existsSync)(explicit)) return explicit;
    console.warn(`[usage-tracker] OPENCLAW_LOG_PATH=${explicit} not found`);
  }
  for (const dir of DEFAULT_LOG_DIRS) {
    if (!(0, import_fs3.existsSync)(dir)) continue;
    try {
      const files = await (0, import_promises3.readdir)(dir);
      if (files.includes("agent.log")) return (0, import_path4.join)(dir, "agent.log");
      const logFile = files.find((f) => f.endsWith(".log"));
      if (logFile) return (0, import_path4.join)(dir, logFile);
    } catch {
    }
  }
  return null;
}
async function incrementUsage(messages = 1) {
  try {
    const url = `http://127.0.0.1:${SIDECAR_PORT}/usage/increment`;
    const headers = { "Content-Type": "application/json" };
    if (SIDECAR_TOKEN) {
      headers["Authorization"] = `Bearer ${SIDECAR_TOKEN}`;
    }
    await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages })
    });
  } catch (err) {
    console.warn("[usage-tracker] increment failed:", err.message);
  }
}
function isMessageLine(line) {
  return MESSAGE_PATTERNS.some((pat) => pat.test(line));
}
var running = false;
async function startUsageTracker() {
  if (running) return;
  const logFile = await findLogFile();
  if (!logFile) {
    console.warn("[usage-tracker] No OpenClaw log file found. Usage tracking disabled.");
    console.warn("[usage-tracker] Set OPENCLAW_LOG_PATH to enable.");
    return;
  }
  console.log(`[usage-tracker] Tailing ${logFile}`);
  running = true;
  const tail = (0, import_child_process5.spawn)("tail", ["-F", "-n", "0", logFile], {
    stdio: ["ignore", "pipe", "ignore"]
  });
  let buffer = "";
  tail.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.trim() && isMessageLine(line)) {
        incrementUsage(1);
      }
    }
  });
  tail.on("exit", (code) => {
    console.warn(`[usage-tracker] tail exited with code ${code}, restarting in 5s...`);
    running = false;
    setTimeout(() => startUsageTracker(), 5e3);
  });
  tail.on("error", (err) => {
    console.warn("[usage-tracker] tail error:", err.message);
    running = false;
    setTimeout(() => startUsageTracker(), 5e3);
  });
}

// src/index.ts
var app = (0, import_express7.default)();
var PORT = parseInt(process.env.PORT || "8787", 10);
app.use(import_express7.default.json());
app.use(authMiddleware);
app.use(health_default);
app.use(openclaw_default);
app.use(heartbeat_default);
app.use(skills_default);
app.use(messaging_default);
app.use(usage_default);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[sidecar] listening on port ${PORT}`);
  startUsageTracker().catch((err) => {
    console.warn("[sidecar] usage tracker failed to start:", err.message);
  });
});
var index_default = app;
