// ── profiles ──────────────────────────────────────────────
export interface Profile {
  id: string; // uuid, PK → auth.users
  display_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  display_name?: string;
  avatar_url?: string;
}

// ── subscriptions ────────────────────────────────────────
export type SubscriptionPlan = "free" | "pro" | "max";
export type SubscriptionStatus = "active" | "canceled" | "expired" | "past_due";

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  provider: string;
  created_at: string;
  updated_at: string;
}

// ── subscription_providers ───────────────────────────────
export interface SubscriptionProvider {
  id: string;
  subscription_id: string;
  provider: string;
  external_customer_id: string | null;
  external_subscription_id: string | null;
  created_at: string;
}

// ── redemption_codes ─────────────────────────────────────
export interface RedemptionCode {
  id: string;
  code: string;
  plan: SubscriptionPlan;
  duration_days: number;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

// ── redemptions ──────────────────────────────────────────
export interface Redemption {
  id: string;
  code_id: string;
  user_id: string;
  plan: SubscriptionPlan;
  duration_days: number;
  redeemed_at: string;
}

// ── usage_tracking ───────────────────────────────────────
export interface UsageRecord {
  id: string;
  user_id: string;
  feature: string;
  used_at: string;
}

// ── feedbacks ───────────────────────────────────────────
export interface Feedback {
  id: string;
  user_id: string;
  rating: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}
