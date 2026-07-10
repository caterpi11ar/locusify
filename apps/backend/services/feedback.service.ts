import { SupabaseClient } from "@supabase/supabase-js";
import * as feedbackRepo from "@/repositories/feedback.repository";

export async function createFeedback(
  supabase: SupabaseClient,
  userId: string,
  input: { rating: number; description?: string },
) {
  return feedbackRepo.createFeedback(supabase, { user_id: userId, ...input });
}

