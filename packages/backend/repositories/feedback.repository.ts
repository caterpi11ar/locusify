import { SupabaseClient } from "@supabase/supabase-js";
import { Feedback } from "@/types/database";

export async function createFeedback(
  supabase: SupabaseClient,
  record: { user_id: string; rating: number; description?: string },
): Promise<Feedback> {
  const { data, error } = await supabase
    .from("feedbacks")
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}

