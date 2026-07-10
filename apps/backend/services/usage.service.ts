import { SupabaseClient } from "@supabase/supabase-js";
import * as usageRepo from "@/repositories/usage.repository";

export async function trackUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: string,
) {
  return usageRepo.createUsageRecord(supabase, { user_id: userId, feature });
}

export async function queryUsage(
  supabase: SupabaseClient,
  userId: string,
  filters: { feature?: string; from?: string; to?: string },
) {
  return usageRepo.queryUsageRecords(supabase, userId, filters);
}
