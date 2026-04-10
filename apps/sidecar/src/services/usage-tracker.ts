import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';

const DEFAULT_LOG_DIRS = [
  join(process.env.HOME || '/home/claw', '.openclaw/agents/main/agent/logs'),
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

async function findLogFile(): Promise<string | null> {
  const explicit = process.env.OPENCLAW_LOG_PATH;
  if (explicit) {
    if (existsSync(explicit)) return explicit;
    console.warn(`[usage-tracker] OPENCLAW_LOG_PATH=${explicit} not found`);
  }

  for (const dir of DEFAULT_LOG_DIRS) {
    if (!existsSync(dir)) continue;
    try {
      const files = await readdir(dir);
      // Prefer agent.log, then any .log file
      if (files.includes('agent.log')) return join(dir, 'agent.log');
      const logFile = files.find((f) => f.endsWith('.log'));
      if (logFile) return join(dir, logFile);
    } catch {
      // skip
    }
  }
  return null;
}

async function incrementUsage(messages = 1): Promise<void> {
  try {
    const url = `http://127.0.0.1:${SIDECAR_PORT}/usage/increment`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (SIDECAR_TOKEN) {
      headers['Authorization'] = `Bearer ${SIDECAR_TOKEN}`;
    }
    await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages }),
    });
  } catch (err) {
    // Non-fatal: usage tracking is best-effort
    console.warn('[usage-tracker] increment failed:', (err as Error).message);
  }
}

function isMessageLine(line: string): boolean {
  return MESSAGE_PATTERNS.some((pat) => pat.test(line));
}

let running = false;

export async function startUsageTracker(): Promise<void> {
  if (running) return;

  const logFile = await findLogFile();
  if (!logFile) {
    console.warn('[usage-tracker] No OpenClaw log file found. Usage tracking disabled.');
    console.warn('[usage-tracker] Set OPENCLAW_LOG_PATH to enable.');
    return;
  }

  console.log(`[usage-tracker] Tailing ${logFile}`);
  running = true;

  const tail = spawn('tail', ['-F', '-n', '0', logFile], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  let buffer = '';

  tail.stdout.on('data', (chunk: Buffer) => {
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
