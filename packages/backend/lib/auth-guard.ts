import { SupabaseClient, User } from "@supabase/supabase-js";
import { extractToken, createAuthenticatedClient } from "./supabase/server";
import { AppError } from "./errors";

interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

export async function requireAuth(request: Request): Promise<AuthContext> {
  const token = extractToken(request);
  if (!token) {
    throw new AppError("UNAUTHORIZED", { en: "Missing or invalid authorization token", zh: "缺少或无效的授权令牌" });
  }

  const supabase = createAuthenticatedClient(token);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new AppError("UNAUTHORIZED", { en: "Invalid or expired token", zh: "令牌无效或已过期" });
  }

  return { supabase, user: data.user };
}
