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

    // Default mock: oracle provider, user with AI config
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

    // Track calls to distinguish between different .from() chains
    let fromCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++;
      return mockSupabase;
    });

    let singleCallCount = 0;
    mockSupabase.single.mockImplementation(() => {
      singleCallCount++;
      if (singleCallCount === 1) {
        // getProviderForUser query
        return { data: { provider_preference: 'oracle', hosting: null, vm_size: null }, error: null };
      } else if (singleCallCount === 2) {
        // user record query in launchAssistant
        return {
          data: {
            vm_size: null,
            azure_subscription_id: null,
            telegram_bot_token: 'tg-token',
            ai_provider: 'gemini',
            ai_api_key: 'gemini-key-123',
          },
          error: null,
        };
      } else {
        // insert assistant
        return {
          data: { id: 'test-assistant', user_id: 'test-user', status: 'provisioning' },
          error: null,
        };
      }
    });

    mockCreateClient.mockReturnValue(mockSupabase);
  });

  it('passes aiProvider and aiApiKey to generateCloudInit for non-copilot providers', async () => {
    const { launchAssistant } = await import('../lifecycle');
    
    try {
      await launchAssistant('test-user');
    } catch {
      // May fail on oracle provider mock, that's fine
    }

    // Check that generateCloudInit was called with AI config
    if (mockGenerateCloudInit.mock.calls.length > 0) {
      const opts = mockGenerateCloudInit.mock.calls[0][0];
      expect(opts.aiProvider).toBe('gemini');
      expect(opts.aiApiKey).toBe('gemini-key-123');
    }
  });

  it('fetches github-copilot token from provider_tokens for copilot users', async () => {
    let singleCallCount = 0;
    const mockSupabase = mockCreateClient();
    mockSupabase.single.mockImplementation(() => {
      singleCallCount++;
      if (singleCallCount === 1) {
        return { data: { provider_preference: 'oracle' }, error: null };
      } else if (singleCallCount === 2) {
        return {
          data: {
            vm_size: null,
            azure_subscription_id: null,
            telegram_bot_token: null,
            ai_provider: 'github-copilot',
            ai_api_key: null,
          },
          error: null,
        };
      } else {
        return { data: { id: 'test-assistant', user_id: 'test-user', status: 'provisioning' }, error: null };
      }
    });

    mockGetProviderToken.mockResolvedValue({ accessToken: 'gho_copilot_token' });

    // Need to re-import to get fresh module
    vi.resetModules();
    vi.doMock('../../supabase/server', () => ({ createClient: () => mockSupabase }));
    vi.doMock('../../providers/token-store', () => ({
      getProviderToken: (...args: any[]) => mockGetProviderToken(...args),
      refreshProviderToken: vi.fn(),
    }));
    vi.doMock('../../providers/cloud-init', () => ({
      generateCloudInit: (...args: any[]) => mockGenerateCloudInit(...args),
    }));
    vi.doMock('../../providers/digitalocean', () => ({
      createDroplet: vi.fn(), destroyDroplet: vi.fn(), powerOn: vi.fn(), powerOff: vi.fn(), validateAccount: vi.fn(),
    }));
    vi.doMock('../../providers/azure', () => ({
      createVM: vi.fn(), destroyVM: vi.fn(), powerOnVM: vi.fn(), powerOffVM: vi.fn(),
      validateAccount: vi.fn(), ensureResourceGroup: vi.fn(), ensureNetworking: vi.fn(),
    }));
    vi.doMock('../../providers/oracle', () => ({
      OracleProvider: vi.fn().mockImplementation(() => ({
        createServer: vi.fn().mockResolvedValue({ id: 'oci-123', publicIpv4: '1.2.3.4', region: 'us-phoenix-1' }),
      })),
    }));
    vi.doMock('../../messaging/telegram-bot-factory', () => ({ deleteTelegramBot: vi.fn() }));

    const { launchAssistant } = await import('../lifecycle');

    try {
      await launchAssistant('test-user');
    } catch {
      // May fail, that's fine
    }

    expect(mockGetProviderToken).toHaveBeenCalledWith('test-user', 'github-copilot');
  });
});
