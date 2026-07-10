import { SupabaseClient } from "@supabase/supabase-js";
import { Subscription, SubscriptionProvider } from "@/types/database";

export async function getSubscriptionByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function getProvidersBySubscriptionId(
  supabase: SupabaseClient,
  subscriptionId: string,
): Promise<SubscriptionProvider[]> {
  const { data, error } = await supabase
    .from("subscription_providers")
    .select("*")
    .eq("subscription_id", subscriptionId);

  if (error) throw error;
  return data ?? [];
}

export async function upsertSubscription(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Subscription>,
): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(
      { user_id: userId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
