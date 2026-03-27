/* ------------------------------------------------------------------ */
/*  Supabase Database Types for ShiftWorker                               */
/* ------------------------------------------------------------------ */

export type Plan = 'free' | 'starter' | 'pro';

export type AssistantStatus =
  | 'provisioning'
  | 'active'
  | 'suspended'
  | 'destroying'
  | 'destroyed';

/**
 * Steps for async Azure VM provisioning.
 * Each step is a single Azure API call that completes within ~10 seconds.
 */
export type ProvisioningStep =
  | 'validate'
  | 'create_rg'
  | 'create_nsg'
  | 'create_vnet'
  | 'create_ip'
  | 'create_nic'
  | 'create_vm'
  | 'wait_vm'
  | 'done';

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  hosting: string | null;
  vm_size: string | null;
  timezone: string | null;
  window_start: number | null;
  onboarding_complete: boolean;
  provider_preference: string | null;
  azure_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assistant {
  id: string;
  user_id: string;
  vm_id: string | null;
  provider: string;
  region: string | null;
  status: AssistantStatus;
  ip_address: string | null;
  sidecar_token: string | null;
  provisioning_step: ProvisioningStep | null;
  provisioning_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  telegram_bot_username: string | null;
  telegram_bot_token: string | null;
  whatsapp_connected: boolean;
  discord_bot_token: string | null;
  slack_bot_token: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageLog {
  id: string;
  assistant_id: string;
  date: string;
  messages_sent: number;
  hours_active: number;
  api_tokens_used: number;
}

export interface ProviderToken {
  id: string;
  user_id: string;
  provider: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<User> & Pick<User, 'id' | 'email'>;
        Update: Partial<User>;
        Relationships: [];
      };
      assistants: {
        Row: Assistant;
        Insert: Partial<Assistant> & Pick<Assistant, 'id' | 'user_id'>;
        Update: Partial<Assistant>;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Subscription> & Pick<Subscription, 'id' | 'user_id'>;
        Update: Partial<Subscription>;
        Relationships: [];
      };
      usage_logs: {
        Row: UsageLog;
        Insert: Partial<UsageLog> & Pick<UsageLog, 'id' | 'assistant_id' | 'date'>;
        Update: Partial<UsageLog>;
        Relationships: [];
      };
      provider_tokens: {
        Row: ProviderToken;
        Insert: Partial<ProviderToken> & Pick<ProviderToken, 'user_id' | 'provider' | 'access_token_encrypted'>;
        Update: Partial<ProviderToken>;
        Relationships: [];
      };
      waitlist: {
        Row: { id: string; email: string; created_at: string };
        Insert: { email: string; id?: string; created_at?: string };
        Update: Partial<{ id: string; email: string; created_at: string }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      plan: Plan;
      assistant_status: AssistantStatus;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
