import { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import * as subscriptionRepo from "@/repositories/subscription.repository";

export async function getSubscription(supabase: SupabaseClient, userId: string) {
  const subscription = await subscriptionRepo.getSubscriptionByUserId(supabase, userId);
  if (!subscription) {
    throw new AppError("NOT_FOUND", { en: "Subscription not found", zh: "订阅未找到" });
  }

  // Check if subscription has expired
  if (
    subscription.current_period_end &&
    new Date(subscription.current_period_end) < new Date()
  ) {
    return { ...subscription, status: "expired" as const };
  }

  return subscription;
}

export async function getSubscriptionProviders(
  supabase: SupabaseClient,
  userId: string,
) {
  const subscription = await subscriptionRepo.getSubscriptionByUserId(supabase, userId);
  if (!subscription) {
    throw new AppError("NOT_FOUND", { en: "Subscription not found", zh: "订阅未找到" });
  }

  const providers = await subscriptionRepo.getProvidersBySubscriptionId(
    supabase,
    subscription.id,
  );
  return { subscription_id: subscription.id, providers };
}
