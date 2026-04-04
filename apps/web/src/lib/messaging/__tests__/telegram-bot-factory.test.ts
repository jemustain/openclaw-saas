import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the telegram module
const mockSendMessage = vi.fn().mockResolvedValue(undefined);
const mockGetEntity = vi.fn().mockResolvedValue({ id: 'botfather' });
const mockGetMessages = vi.fn().mockResolvedValue([
  { text: 'Done! Congratulations on your new bot. Use this token to access the HTTP API:\n123456:ABC-DEF-test-token\nKeep your token secure' },
]);
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn().mockResolvedValue(undefined);

vi.mock('telegram', () => {
  function TelegramClient() {
    return {
      connect: mockConnect,
      connected: false,
      sendMessage: mockSendMessage,
      getEntity: mockGetEntity,
      getMessages: mockGetMessages,
      disconnect: mockDisconnect,
    };
  }
  return { TelegramClient };
});

vi.mock('telegram/sessions', () => {
  function StringSession(s: string) { return s; }
  return { StringSession };
});

// Set required env vars
process.env.TELEGRAM_API_ID = '12345';
process.env.TELEGRAM_API_HASH = 'testhash';
process.env.TELEGRAM_SESSION_STRING = 'testsession';

import { createTelegramBot } from '../telegram-bot-factory';

describe('telegram-bot-factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetMessages.mockResolvedValue([
      { text: 'Done! Congratulations on your new bot. Use this token to access the HTTP API:\n123456:ABC-DEF-test-token\nKeep your token secure' },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends /setjoingroups Enable command during bot configuration', async () => {
    // Run createTelegramBot while advancing timers
    const promise = createTelegramBot('TestBot', 'testbot');

    // Advance timers repeatedly to flush all sleeps
    for (let i = 0; i < 50; i++) {
      await vi.advanceTimersByTimeAsync(5000);
    }

    const result = await promise;

    // Collect all sendMessage calls
    const messages = mockSendMessage.mock.calls.map(
      (call: any[]) => call[1]?.message
    );

    // Verify the configuration commands are sent
    expect(messages).toContain('/setdescription');
    expect(messages).toContain('/setprivacy');
    expect(messages).toContain('Disable');
    expect(messages).toContain('/setjoingroups');
    expect(messages).toContain('Enable');

    // Verify order: /setprivacy before /setjoingroups
    const privacyIdx = messages.indexOf('/setprivacy');
    const joinGroupsIdx = messages.indexOf('/setjoingroups');
    expect(joinGroupsIdx).toBeGreaterThan(privacyIdx);

    // Verify order: /setjoingroups before Enable
    const enableIdx = messages.lastIndexOf('Enable');
    expect(enableIdx).toBeGreaterThan(joinGroupsIdx);
  }, 30000);
});
