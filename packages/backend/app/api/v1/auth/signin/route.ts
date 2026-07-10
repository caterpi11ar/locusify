import { withHandler } from "@/lib/with-handler";
import { createClient } from "@supabase/supabase-js";
import { successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { signinSchema } from "@/validators/auth.validators";
import { provisionUser } from "@/services/provision.service";

export const POST = withHandler(async (request) => {
  const body = await request.json();
  const result = signinSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid input", zh: "输入无效" }, result.error.issues);
  }

  const { email, password } = result.data;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user || !data.session) {
    throw new AppError("UNAUTHORIZED", { en: "Invalid email or password", zh: "邮箱或密码错误" });
  }

  await provisionUser(data.user);

  return successResponse({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    user: { id: data.user.id, email: data.user.email },
  });
});
