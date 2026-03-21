/* ------------------------------------------------------------------ */
/*  Supabase Database Types for HandsOff                               */
/* ------------------------------------------------------------------ */

export type Plan = 'free' | 'starter' | 'pro';

export type AssistantStatus =
  | 'provisioning'
  | 'active'
  | 'suspended'
  | 'destroying'
  | 'destroyed';

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

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
