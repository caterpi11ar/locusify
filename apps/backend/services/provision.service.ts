import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import type { User, SupabaseClient } from "@supabase/supabase-js";

async function upsertWithRetry(
  supabase: SupabaseClient,
  table: string,
  data: Record<string, unknown>,
  options: { onConflict: string; ignoreDuplicates: boolean },
  maxAttempts = 3,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.from(table).upsert(data, options);
    if (!error) return;
    lastError = error;
    if (attempt < maxAttempts && /fetch failed|ECONNRESET|socket/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 300 * attempt));
      continue;
    }
    break;
  }
  throw lastError;
}

/**
 * Ensure profile and free subscription exist for a user.
 * Safe to call multiple times — skips creation if records already exist.
 */
export async function provisionUser(user: User): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  try {
    await upsertWithRetry(
      supabase,
      "profiles",
      {
        id: user.id,
        display_name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email ??
          "User",
        avatar_url:
          user.user_metadata?.avatar_url ??
          user.user_metadata?.picture ??
          null,
        provider: user.app_metadata?.provider ?? null,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Profile provisioning failed:", msg);
    throw new AppError("INTERNAL_ERROR", {
      en: `Profile provisioning failed: ${msg}`,
      zh: `用户资料初始化失败: ${msg}`,
    });
  }

  try {
    await upsertWithRetry(
      supabase,
      "subscriptions",
      {
        user_id: user.id,
        plan: "free",
        status: "active",
        current_period_end: null,
        cancel_at_period_end: false,
        provider: "system",
        created_at: now,
        updated_at: now,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Subscription provisioning failed:", msg);
    throw new AppError("INTERNAL_ERROR", {
      en: `Subscription provisioning failed: ${msg}`,
      zh: `订阅初始化失败: ${msg}`,
    });
  }
}
