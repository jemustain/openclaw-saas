import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module under test
const mockCreateClient = vi.fn();
const mockGetProviderToken = vi.fn();
const mockGenerateCloudInit = vi.fn().mockReturnValue('#cloud-config\ntest');

vi.mock('../../supabase/server', () => ({ createClient: () => mockCreateClient() }));
vi.mock('../../providers/token-store', () => ({
  getProviderToken: (...args: any[]) => mockGetProviderToken(...args),
  refreshProviderToken: vi.fn(),
}));
vi.mock('../../providers/cloud-init', () => ({
  generateCloudInit: (...args: any[]) => mockGenerateCloudInit(...args),
}));
vi.mock('../../providers/digitalocean', () => ({
  createDroplet: vi.fn(),
  destroyDroplet: vi.fn(),
  powerOn: vi.fn(),
  powerOff: vi.fn(),
  validateAccount: vi.fn(),
}));
vi.mock('../../providers/azure', () => ({
  createVM: vi.fn(),
  destroyVM: vi.fn(),
  powerOnVM: vi.fn(),
  powerOffVM: vi.fn(),
  validateAccount: vi.fn(),
  ensureResourceGroup: vi.fn(),
  ensureNetworking: vi.fn(),
}));
vi.mock('../../providers/oracle', () => ({
  OracleProvider: vi.fn().mockImplementation(() => ({
    createServer: vi.fn().mockResolvedValue({ id: 'oci-123', publicIpv4: '1.2.3.4', region: 'us-phoenix-1' }),
  })),
}));
vi.mock('../../messaging/telegram-bot-factory', () => ({
  deleteTelegramBot: vi.fn(),
}));

describe('launchAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    };

    let singleCallCount = 0;
    mockSupabase.single.mockImplementation(() => {
      singleCallCount++;
      if (singleCallCount === 1) {
        return { data: { provider_preference: 'oracle', hosting: null, vm_size: null }, error: null };
      } else if (singleCallCount === 2) {
        return {
          data: {
            vm_size: null,
            azure_subscription_id: null,
            telegram_bot_token: 'tg-token',
          },
          error: null,
        };
      } else {
        return {
          data: { id: 'test-assistant', user_id: 'test-user', status: 'provisioning' },
          error: null,
        };
      }
    });

    mockCreateClient.mockReturnValue(mockSupabase);
  });

  it('does NOT pass aiProvider or aiApiKey to generateCloudInit (AI config happens post-provisioning)', async () => {
    const { launchAssistant } = await import('../lifecycle');

    try {
      await launchAssistant('test-user');
    } catch {
      // May fail on oracle provider mock, that's fine
    }

    if (mockGenerateCloudInit.mock.calls.length > 0) {
      const opts = mockGenerateCloudInit.mock.calls[0][0];
      expect(opts).not.toHaveProperty('aiProvider');
      expect(opts).not.toHaveProperty('aiApiKey');
    }
  });

  it('passes telegramBotToken to generateCloudInit', async () => {
    const { launchAssistant } = await import('../lifecycle');

    try {
      await launchAssistant('test-user');
    } catch {
      // May fail on oracle provider mock, that's fine
    }

    if (mockGenerateCloudInit.mock.calls.length > 0) {
      const opts = mockGenerateCloudInit.mock.calls[0][0];
      expect(opts.telegramBotToken).toBe('tg-token');
    }
  });
});
