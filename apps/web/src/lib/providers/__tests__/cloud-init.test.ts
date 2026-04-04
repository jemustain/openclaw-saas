import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { generateCloudInit } from '../cloud-init';

/**
 * Helper: parse cloud-init output as YAML and return the parsed document.
 * Throws if the YAML is invalid - this is the core guard against the
 * inline-Python-breaks-YAML class of bugs.
 */
function parseCloudInit(output: string): Record<string, any> {
  const doc = yaml.load(output);
  if (typeof doc !== 'object' || doc === null) {
    throw new Error('cloud-init output did not parse as a YAML object');
  }
  return doc as Record<string, any>;
}

/**
 * Helper: extract the content of a write_files entry by path.
 */
function getWriteFileContent(doc: Record<string, any>, filePath: string): string | undefined {
  const files = doc.write_files as Array<{ path: string; content: string }> | undefined;
  if (!files) return undefined;
  const entry = files.find(f => f.path === filePath);
  return entry?.content;
}

describe('cloud-init', () => {
  const baseOpts = {
    sidecarToken: 'test-token',
    portalUrl: 'https://shiftworker.ai',
    instanceId: 'test-instance-id',
  };

  // --- YAML validity tests (the critical guard) ---

  it('parses as valid YAML with no optional features', () => {
    const output = generateCloudInit(baseOpts);
    const doc = parseCloudInit(output);
    expect(doc.packages).toContain('curl');
    expect(doc.runcmd).toBeDefined();
  });

  it('parses as valid YAML with AI provider only', () => {
    const output = generateCloudInit({
      ...baseOpts,
      aiProvider: 'github-copilot',
      aiApiKey: 'gho_testtoken123',
    });
    const doc = parseCloudInit(output);
    expect(doc.write_files).toBeDefined();
    expect(doc.runcmd).toBeDefined();
  });

  it('parses as valid YAML with Telegram only', () => {
    const output = generateCloudInit({
      ...baseOpts,
      telegramBotToken: '123456:ABC-DEF',
    });
    const doc = parseCloudInit(output);
    expect(doc.write_files).toBeDefined();
    expect(doc.runcmd).toBeDefined();
  });

  it('parses as valid YAML with both AI provider and Telegram', () => {
    const output = generateCloudInit({
      ...baseOpts,
      aiProvider: 'github-copilot',
      aiApiKey: 'gho_testtoken123',
      telegramBotToken: '123456:ABC-DEF',
    });
    const doc = parseCloudInit(output);
    expect(doc.write_files).toBeDefined();
    expect(doc.runcmd).toBeDefined();
  });

  it('parses as valid YAML with special characters in API key', () => {
    const output = generateCloudInit({
      ...baseOpts,
      aiProvider: 'openai',
      aiApiKey: "key-with'quotes\"and\\backslashes&ampersands<brackets>",
    });
    // Must not throw
    const doc = parseCloudInit(output);
    expect(doc.runcmd).toBeDefined();
  });

  it('parses as valid YAML for every supported AI provider', () => {
    for (const provider of ['gemini', 'openai', 'anthropic', 'github-copilot']) {
      const output = generateCloudInit({
        ...baseOpts,
        aiProvider: provider,
        aiApiKey: `test-key-for-${provider}`,
        telegramBotToken: '123:TOK',
      });
      // Must not throw for any provider
      const doc = parseCloudInit(output);
      expect(doc.runcmd).toBeDefined();
    }
  });

  // --- Structural tests ---

  it('write_files contains all required service files', () => {
    const doc = parseCloudInit(generateCloudInit(baseOpts));
    const paths = (doc.write_files as Array<{ path: string }>).map(f => f.path);
    expect(paths).toContain('/etc/shiftworker/sidecar.env');
    expect(paths).toContain('/etc/systemd/system/openclaw-sidecar.service');
    expect(paths).toContain('/etc/systemd/system/shiftworker-sidecar.service');
    expect(paths).toContain('/opt/shiftworker/patch-config.py');
    expect(paths).toContain('/opt/shiftworker/setup.sh');
  });

  it('adds configure-ai.py write_file when aiProvider is set', () => {
    const doc = parseCloudInit(generateCloudInit({
      ...baseOpts,
      aiProvider: 'gemini',
      aiApiKey: 'test-key',
    }));
    const paths = (doc.write_files as Array<{ path: string }>).map(f => f.path);
    expect(paths).toContain('/opt/shiftworker/configure-ai.py');
  });

  it('does NOT add configure-ai.py when aiProvider is not set', () => {
    const doc = parseCloudInit(generateCloudInit(baseOpts));
    const paths = (doc.write_files as Array<{ path: string }>).map(f => f.path);
    expect(paths).not.toContain('/opt/shiftworker/configure-ai.py');
  });

  it('adds configure-telegram.py write_file when telegramBotToken is set', () => {
    const doc = parseCloudInit(generateCloudInit({
      ...baseOpts,
      telegramBotToken: '123:ABC',
    }));
    const paths = (doc.write_files as Array<{ path: string }>).map(f => f.path);
    expect(paths).toContain('/opt/shiftworker/configure-telegram.py');
  });

  it('does NOT add configure-telegram.py when telegramBotToken is not set', () => {
    const doc = parseCloudInit(generateCloudInit(baseOpts));
    const paths = (doc.write_files as Array<{ path: string }>).map(f => f.path);
    expect(paths).not.toContain('/opt/shiftworker/configure-telegram.py');
  });

  // --- Content tests ---

  it('setup.sh contains phone-home curl', () => {
    const doc = parseCloudInit(generateCloudInit(baseOpts));
    const setupSh = getWriteFileContent(doc, '/opt/shiftworker/setup.sh');
    expect(setupSh).toBeDefined();
    expect(setupSh).toContain('phone-home');
    expect(setupSh).toContain('SIDECAR_TOKEN');
  });

  it('setup.sh calls configure-ai.py when aiProvider is set', () => {
    const doc = parseCloudInit(generateCloudInit({
      ...baseOpts,
      aiProvider: 'github-copilot',
      aiApiKey: 'gho_test',
    }));
    const setupSh = getWriteFileContent(doc, '/opt/shiftworker/setup.sh');
    expect(setupSh).toContain('python3 /opt/shiftworker/configure-ai.py');
  });

  it('setup.sh calls configure-telegram.py when telegramBotToken is set', () => {
    const doc = parseCloudInit(generateCloudInit({
      ...baseOpts,
      telegramBotToken: '123:ABC',
    }));
    const setupSh = getWriteFileContent(doc, '/opt/shiftworker/setup.sh');
    expect(setupSh).toContain('python3 /opt/shiftworker/configure-telegram.py');
  });

  it('setup.sh does NOT contain inline python3 -c', () => {
    const doc = parseCloudInit(generateCloudInit({
      ...baseOpts,
      aiProvider: 'github-copilot',
      aiApiKey: 'gho_test',
      telegramBotToken: '123:ABC',
    }));
    const setupSh = getWriteFileContent(doc, '/opt/shiftworker/setup.sh');
    expect(setupSh).not.toContain('python3 -c');
  });

  it('configure-ai.py contains the correct provider and model', () => {
    const doc = parseCloudInit(generateCloudInit({
      ...baseOpts,
      aiProvider: 'gemini',
      aiApiKey: 'test-gemini-key',
    }));
    const aiScript = getWriteFileContent(doc, '/opt/shiftworker/configure-ai.py');
    expect(aiScript).toBeDefined();
    expect(aiScript).toContain("'gemini'");
    expect(aiScript).toContain('GEMINI_API_KEY');
    expect(aiScript).toContain('test-gemini-key');
    expect(aiScript).toContain('gemini/gemini-2.5-flash');
  });

  it('configure-ai.py sets model under agents.defaults.model (not defaultModel)', () => {
    const doc = parseCloudInit(generateCloudInit({
      ...baseOpts,
      aiProvider: 'github-copilot',
      aiApiKey: 'gho_test',
    }));
    const aiScript = getWriteFileContent(doc, '/opt/shiftworker/configure-ai.py');
    expect(aiScript).toBeDefined();
    // Must use agents.defaults.model path, not root-level defaultModel
    expect(aiScript).toContain("agents");
    expect(aiScript).toContain("defaults");
    expect(aiScript).not.toContain("config['defaultModel']");
  });

  it('configure-ai.py maps each provider to correct env var', () => {
    const providerEnvMap: Record<string, string> = {
      'gemini': 'GEMINI_API_KEY',
      'openai': 'OPENAI_API_KEY',
      'anthropic': 'ANTHROPIC_API_KEY',
      'github-copilot': 'GITHUB_TOKEN',
    };

    for (const [provider, envVar] of Object.entries(providerEnvMap)) {
      const doc = parseCloudInit(generateCloudInit({
        ...baseOpts,
        aiProvider: provider,
        aiApiKey: `key-for-${provider}`,
      }));
      const aiScript = getWriteFileContent(doc, '/opt/shiftworker/configure-ai.py');
      expect(aiScript).toContain(envVar);
      expect(aiScript).toContain(`key-for-${provider}`);
    }
  });

  it('configure-telegram.py sets dmPolicy and groupPolicy', () => {
    const doc = parseCloudInit(generateCloudInit({
      ...baseOpts,
      telegramBotToken: '123456:ABC-DEF',
    }));
    const tgScript = getWriteFileContent(doc, '/opt/shiftworker/configure-telegram.py');
    expect(tgScript).toBeDefined();
    expect(tgScript).toContain('dmPolicy');
    expect(tgScript).toContain('groupPolicy');
    expect(tgScript).toContain('requireMention');
  });

  it('sidecar.env contains correct tokens', () => {
    const doc = parseCloudInit(generateCloudInit(baseOpts));
    const env = getWriteFileContent(doc, '/etc/shiftworker/sidecar.env');
    expect(env).toContain('SIDECAR_TOKEN=test-token');
    expect(env).toContain('PORTAL_URL=https://shiftworker.ai');
    expect(env).toContain('INSTANCE_ID=test-instance-id');
  });

  it('runcmd calls setup.sh', () => {
    const doc = parseCloudInit(generateCloudInit(baseOpts));
    expect(doc.runcmd).toEqual([['bash', '/opt/shiftworker/setup.sh']]);
  });
});
