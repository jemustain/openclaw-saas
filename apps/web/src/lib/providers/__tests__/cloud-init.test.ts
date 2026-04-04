import { describe, it, expect } from 'vitest';
import { generateCloudInit } from '../cloud-init';

describe('cloud-init', () => {
  const baseOpts = {
    sidecarToken: 'test-token',
    portalUrl: 'https://shiftworker.ai',
    instanceId: 'test-instance-id',
  };

  it('includes groupPolicy and requireMention in telegram config', () => {
    const output = generateCloudInit({
      ...baseOpts,
      telegramBotToken: '123456:ABC-DEF',
    });

    expect(output).toContain('groupPolicy');
    expect(output).toContain('requireMention');
  });

  it('does not include telegram config when no bot token provided', () => {
    const output = generateCloudInit(baseOpts);

    expect(output).not.toContain('groupPolicy');
    expect(output).not.toContain('TELEGRAM_TOKEN');
  });

  it('includes AI model config when aiProvider is set', () => {
    const result = generateCloudInit({
      ...baseOpts,
      aiProvider: 'gemini',
      aiApiKey: 'test-gemini-key',
    });

    expect(result).toContain('Configuring AI model');
    expect(result).toContain("'gemini'");
    expect(result).toContain('GEMINI_API_KEY');
    expect(result).toContain('test-gemini-key');
    expect(result).toContain('gemini/gemini-2.5-flash');
  });

  it('does NOT include AI model config when aiProvider is not set', () => {
    const result = generateCloudInit(baseOpts);

    expect(result).not.toContain('Configuring AI model');
    expect(result).not.toContain('GEMINI_API_KEY');
    expect(result).not.toContain('OPENAI_API_KEY');
  });

  it('configures github-copilot provider correctly', () => {
    const result = generateCloudInit({
      ...baseOpts,
      aiProvider: 'github-copilot',
      aiApiKey: 'gho_testtoken123',
    });

    expect(result).toContain('Configuring AI model');
    expect(result).toContain('GITHUB_TOKEN');
    expect(result).toContain('gho_testtoken123');
    expect(result).toContain('github-copilot/claude-sonnet-4');
  });

  it('configures openai provider correctly', () => {
    const result = generateCloudInit({
      ...baseOpts,
      aiProvider: 'openai',
      aiApiKey: 'sk-test123',
    });

    expect(result).toContain('OPENAI_API_KEY');
    expect(result).toContain('sk-test123');
  });

  it('configures anthropic provider correctly', () => {
    const result = generateCloudInit({
      ...baseOpts,
      aiProvider: 'anthropic',
      aiApiKey: 'sk-ant-test123',
    });

    expect(result).toContain('ANTHROPIC_API_KEY');
    expect(result).toContain('sk-ant-test123');
  });

  it('handles API keys with special characters', () => {
    const result = generateCloudInit({
      ...baseOpts,
      aiProvider: 'openai',
      aiApiKey: "key-with'quotes\"and\\backslashes",
    });

    expect(result).toContain('Configuring AI model');
    // Should not break the script
    expect(result).toContain('OPENAI_API_KEY');
  });

  it('still includes telegram config alongside AI config', () => {
    const result = generateCloudInit({
      ...baseOpts,
      aiProvider: 'gemini',
      aiApiKey: 'test-key',
      telegramBotToken: 'telegram-bot-token',
    });

    expect(result).toContain('Configuring AI model');
    expect(result).toContain('Configuring Telegram bot');
  });
});
