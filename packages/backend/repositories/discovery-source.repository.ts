import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { discoverySourceSchema } from "@/validators/discovery-source.validators";

function checkError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "42501") {
    throw new AppError("FORBIDDEN", { en: "Survey not eligible", zh: "账号不符合问卷资格" });
  }
  throw error;
}

export async function getDiscoverySource(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("get_discovery_source");
  checkError(error);
  return data;
}

export async function saveDiscoverySource(supabase: SupabaseClient, input: z.infer<typeof discoverySourceSchema>) {
  const { data, error } = await supabase.rpc("save_discovery_source", {
    p_status: "source" in input ? "submitted" : "skipped",
    p_source: "source" in input ? input.source : null,
  });
  checkError(error);
  return data;
}
