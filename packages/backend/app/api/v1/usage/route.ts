import { withAuth } from "@/lib/with-auth";
import { successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { trackUsageSchema, queryUsageSchema } from "@/validators/usage.validators";
import * as usageService from "@/services/usage.service";

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json();
  const result = trackUsageSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid input", zh: "输入无效" }, result.error.issues);
  }

  const record = await usageService.trackUsage(supabase, user.id, result.data.feature);
  return successResponse(record, 201);
});

export const GET = withAuth(async (request, { supabase, user }) => {
  const { searchParams } = request.nextUrl;
  const raw = {
    feature: searchParams.get("feature") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  const result = queryUsageSchema.safeParse(raw);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid query parameters", zh: "查询参数无效" }, result.error.issues);
  }

  const records = await usageService.queryUsage(supabase, user.id, result.data);
  return successResponse(records);
});
