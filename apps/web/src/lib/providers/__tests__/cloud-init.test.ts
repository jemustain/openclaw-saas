import { describe, it, expect } from 'vitest';
import { generateCloudInit } from '../cloud-init';

describe('cloud-init', () => {
  it('includes groupPolicy and requireMention in telegram config', () => {
    const output = generateCloudInit({
      sidecarToken: 'test-token',
      portalUrl: 'https://example.com',
      instanceId: 'test-instance',
      telegramBotToken: '123456:ABC-DEF',
    });

    expect(output).toContain('groupPolicy');
    expect(output).toContain('requireMention');
  });

  it('does not include telegram config when no bot token provided', () => {
    const output = generateCloudInit({
      sidecarToken: 'test-token',
      portalUrl: 'https://example.com',
      instanceId: 'test-instance',
    });

    expect(output).not.toContain('groupPolicy');
    expect(output).not.toContain('TELEGRAM_TOKEN');
  });
});
