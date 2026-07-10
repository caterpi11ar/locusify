import { withHandler } from "@/lib/with-handler";
import { createClient } from "@supabase/supabase-js";
import { successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { forgotPasswordSchema } from "@/validators/auth.validators";

export const POST = withHandler(async (request) => {
  const body = await request.json();
  const result = forgotPasswordSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid input", zh: "输入无效" }, result.error.issues);
  }

  const { email, redirect_url } = result.data;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirect_url,
  });

  if (error) {
    throw new AppError("INTERNAL_ERROR", { en: error.message, zh: "发送重置邮件失败" });
  }

  return successResponse({ message: "Password reset email sent" });
});
