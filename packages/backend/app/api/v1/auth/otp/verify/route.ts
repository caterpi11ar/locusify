import { withHandler } from "@/lib/with-handler";
import { createClient } from "@supabase/supabase-js";
import { successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { otpVerifySchema } from "@/validators/auth.validators";
import { provisionUser } from "@/services/provision.service";

export const POST = withHandler(async (request) => {
  const body = await request.json();
  const result = otpVerifySchema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid input", zh: "输入无效" }, result.error.issues);
  }

  const { email, token } = result.data;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    throw new AppError("UNAUTHORIZED", { en: error.message, zh: error.message });
  }

  if (!data.user || !data.session) {
    throw new AppError("UNAUTHORIZED", { en: "Invalid or expired verification code", zh: "验证码无效或已过期" });
  }

  await provisionUser(data.user);

  return successResponse({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    user: { id: data.user.id, email: data.user.email },
  });
});
