import { SupabaseClient } from "@supabase/supabase-js";
import { SubscriptionPlan } from "@/types/database";
import { AppError } from "@/lib/errors";
import * as redemptionRepo from "@/repositories/redemption.repository";
import * as subscriptionRepo from "@/repositories/subscription.repository";

function validateRedemptionCode(code: Awaited<ReturnType<typeof redemptionRepo.getRedemptionCodeByCode>>) {
  if (!code) {
    throw new AppError("NOT_FOUND", { en: "Redemption code not found", zh: "兑换码未找到" });
  }
  if (!code.is_active) {
    throw new AppError("GONE", { en: "Redemption code is no longer active", zh: "兑换码已失效" });
  }
  if (code.current_uses >= code.max_uses) {
    throw new AppError("GONE", { en: "Redemption code has reached maximum uses", zh: "兑换码已达到最大使用次数" });
  }
  if (code.expires_at && new Date(code.expires_at) < new Date()) {
    throw new AppError("GONE", { en: "Redemption code has expired", zh: "兑换码已过期" });
  }
  return code;
}

export async function validateCode(supabase: SupabaseClient, code: string) {
  const redemptionCode = await redemptionRepo.getRedemptionCodeByCode(supabase, code);
  const validCode = validateRedemptionCode(redemptionCode);
  return {
    valid: true,
    plan: validCode.plan,
    duration_days: validCode.duration_days,
    remaining_uses: validCode.max_uses - validCode.current_uses,
  };
}

export async function redeemCode(
  supabase: SupabaseClient,
  userId: string,
  code: string,
) {
  // 1. Find and validate the code
  const redemptionCode = await redemptionRepo.getRedemptionCodeByCode(supabase, code);
  const validCode = validateRedemptionCode(redemptionCode);

  // 2. Check if user already redeemed this code
  const existing = await redemptionRepo.getUserRedemptionForCode(
    supabase,
    validCode.id,
    userId,
  );
  if (existing) {
    throw new AppError("CONFLICT", { en: "You have already redeemed this code", zh: "您已兑换过此码" });
  }

  // 3. Create redemption record
  const redemption = await redemptionRepo.createRedemption(supabase, {
    code_id: validCode.id,
    user_id: userId,
    plan: validCode.plan,
    duration_days: validCode.duration_days,
  });

  // 4. Increment code uses
  await redemptionRepo.incrementCodeUses(supabase, validCode.id, validCode.current_uses);

  // 5. Update subscription
  const currentSub = await subscriptionRepo.getSubscriptionByUserId(supabase, userId);
  const now = new Date();
  const baseDate =
    currentSub?.current_period_end && new Date(currentSub.current_period_end) > now
      ? new Date(currentSub.current_period_end)
      : now;
  const newPeriodEnd = new Date(baseDate);
  newPeriodEnd.setDate(newPeriodEnd.getDate() + validCode.duration_days);

  await subscriptionRepo.upsertSubscription(supabase, userId, {
    plan: validCode.plan as SubscriptionPlan,
    status: "active",
    current_period_end: newPeriodEnd.toISOString(),
  });

  return redemption;
}

export async function getRedemptionHistory(supabase: SupabaseClient, userId: string) {
  return redemptionRepo.getRedemptionsByUserId(supabase, userId);
}
