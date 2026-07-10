import { SupabaseClient } from "@supabase/supabase-js";
import { UsageRecord } from "@/types/database";

export async function createUsageRecord(
  supabase: SupabaseClient,
  record: { user_id: string; feature: string },
): Promise<UsageRecord> {
  const { data, error } = await supabase
    .from("usage_tracking")
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function queryUsageRecords(
  supabase: SupabaseClient,
  userId: string,
  filters: { feature?: string; from?: string; to?: string },
): Promise<UsageRecord[]> {
  let query = supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .order("used_at", { ascending: false });

  if (filters.feature) {
    query = query.eq("feature", filters.feature);
  }
  if (filters.from) {
    query = query.gte("used_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("used_at", filters.to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
