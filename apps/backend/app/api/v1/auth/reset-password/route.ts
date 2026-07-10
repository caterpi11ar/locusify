import { withHandler } from "@/lib/with-handler";
import { createClient } from "@supabase/supabase-js";
import { successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { resetPasswordSchema } from "@/validators/auth.validators";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withHandler(async (request) => {
  const body = await request.json();
  const result = resetPasswordSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid input", zh: "输入无效" }, result.error.issues);
  }

  const { token_hash, new_password } = result.data;

  // Decode JWT payload to verify this token came from a recovery flow
  const parts = token_hash.split(".");
  if (parts.length !== 3) {
    throw new AppError("UNAUTHORIZED", { en: "Invalid token format", zh: "令牌格式无效" });
  }
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  const isRecovery = Array.isArray(payload.amr) && payload.amr.some((m: { method: string }) => m.method === "otp");
  if (!isRecovery) {
    throw new AppError("FORBIDDEN", { en: "Token is not from a password recovery flow", zh: "令牌不是来自密码重置流程" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token_hash);

  if (error || !user) {
    throw new AppError("UNAUTHORIZED", { en: "Invalid or expired reset token", zh: "重置令牌无效或已过期" });
  }

  const adminClient = createAdminClient();
  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    password: new_password,
  });

  if (updateError) {
    throw new AppError("INTERNAL_ERROR", { en: updateError.message, zh: "密码更新失败" });
  }

  return successResponse({ message: "Password has been reset" });
});
