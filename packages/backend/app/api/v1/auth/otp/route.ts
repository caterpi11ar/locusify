import { withHandler } from "@/lib/with-handler";
import { createClient } from "@supabase/supabase-js";
import { successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { otpSendSchema } from "@/validators/auth.validators";

export const POST = withHandler(async (request) => {
  const body = await request.json();
  const result = otpSendSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid input", zh: "输入无效" }, result.error.issues);
  }

  const { email } = result.data;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    throw new AppError("INTERNAL_ERROR", { en: error.message, zh: "验证码发送失败" });
  }

  return successResponse({ message: "Verification code sent" });
});
