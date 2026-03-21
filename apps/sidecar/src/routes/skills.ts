import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);
const router = Router();

const SKILLS_DIRS = [
  '/usr/local/lib/node_modules/openclaw/skills',
  join(process.env.HOME || '/root', '.openclaw/workspace/skills'),
  join(process.env.HOME || '/root', '.agents/skills'),
];

router.get('/skills', async (_req: Request, res: Response) => {
  try {
    // Try CLI first
    try {
      const { stdout } = await execAsync('openclaw skill list --json 2>/dev/null || openclaw skill list 2>/dev/null');
      if (stdout.trim()) {
        try {
          const skills = JSON.parse(stdout.trim());
          res.json({ skills });
          return;
        } catch {
          // CLI returned non-JSON, parse as text
          const skills = stdout.trim().split('\n').filter(Boolean).map((name: string) => ({ name: name.trim() }));
          res.json({ skills });
          return;
        }
      }
    } catch {}

    // Fallback: read from filesystem
    const skills: Array<{ name: string; path: string }> = [];
    for (const dir of SKILLS_DIRS) {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            skills.push({ name: entry.name, path: join(dir, entry.name) });
          }
        }
      } catch {}
    }

    res.json({ skills });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list skills', details: err.message });
  }
});

router.post('/skills/install', async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Missing or invalid skill name' });
    return;
  }

  // Sanitize: only allow alphanumeric, hyphens, underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    res.status(400).json({ error: 'Invalid skill name format' });
    return;
  }

  try {
    const { stdout, stderr } = await execAsync(`openclaw skill install ${name}`, { timeout: 60_000 });
    res.json({ status: 'installed', name, output: stdout.trim() || stderr.trim() });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to install skill', details: err.stderr || err.message });
  }
});

router.post('/skills/remove', async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Missing or invalid skill name' });
    return;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    res.status(400).json({ error: 'Invalid skill name format' });
    return;
  }

  try {
    const { stdout, stderr } = await execAsync(`openclaw skill remove ${name}`, { timeout: 30_000 });
    res.json({ status: 'removed', name, output: stdout.trim() || stderr.trim() });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove skill', details: err.stderr || err.message });
  }
});

export default router;
