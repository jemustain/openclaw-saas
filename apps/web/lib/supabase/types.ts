export type Plan = 'free' | 'starter' | 'pro';

export type AssistantStatus =
  | 'provisioning'
  | 'active'
  | 'suspended'
  | 'destroying'
  | 'destroyed';

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  timezone: string | null;
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
  created_at: string;
  updated_at: string;
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

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Omit<User, 'id'>>;
      };
      assistants: {
        Row: Assistant;
        Insert: Omit<Assistant, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Omit<Assistant, 'id'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Omit<Subscription, 'id'>>;
      };
      usage_logs: {
        Row: UsageLog;
        Insert: Omit<UsageLog, 'messages_sent' | 'hours_active' | 'api_tokens_used'> & { messages_sent?: number; hours_active?: number; api_tokens_used?: number };
        Update: Partial<Omit<UsageLog, 'id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      plan: Plan;
      assistant_status: AssistantStatus;
      subscription_status: SubscriptionStatus;
    };
  };
}
