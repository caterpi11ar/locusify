import { SupabaseClient } from "@supabase/supabase-js";
import { ProfileUpdate } from "@/types/database";
import { AppError } from "@/lib/errors";
import * as profileRepo from "@/repositories/profile.repository";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const profile = await profileRepo.getProfileByUserId(supabase, userId);
  if (!profile) {
    throw new AppError("NOT_FOUND", { en: "Profile not found", zh: "用户资料未找到" });
  }
  return profile;
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: ProfileUpdate,
) {
  await profileRepo.getProfileByUserId(supabase, userId);
  return profileRepo.updateProfile(supabase, userId, updates);
}
