import { SupabaseClient } from "@supabase/supabase-js";
import { RedemptionCode, Redemption } from "@/types/database";

export async function getRedemptionCodeByCode(
  supabase: SupabaseClient,
  code: string,
): Promise<RedemptionCode | null> {
  const { data, error } = await supabase
    .from("redemption_codes")
    .select("*")
    .eq("code", code)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function getUserRedemptionForCode(
  supabase: SupabaseClient,
  codeId: string,
  userId: string,
): Promise<Redemption | null> {
  const { data, error } = await supabase
    .from("redemptions")
    .select("*")
    .eq("code_id", codeId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function createRedemption(
  supabase: SupabaseClient,
  redemption: {
    code_id: string;
    user_id: string;
    plan: string;
    duration_days: number;
  },
): Promise<Redemption> {
  const { data, error } = await supabase
    .from("redemptions")
    .insert(redemption)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function incrementCodeUses(
  supabase: SupabaseClient,
  codeId: string,
  currentUses: number,
): Promise<void> {
  const { error } = await supabase
    .from("redemption_codes")
    .update({ current_uses: currentUses + 1 })
    .eq("id", codeId);

  if (error) throw error;
}

export async function getRedemptionsByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<Redemption[]> {
  const { data, error } = await supabase
    .from("redemptions")
    .select("*")
    .eq("user_id", userId)
    .order("redeemed_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
