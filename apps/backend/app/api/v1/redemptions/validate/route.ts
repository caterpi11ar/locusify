import { withAuth } from "@/lib/with-auth";
import { successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { validateCodeSchema } from "@/validators/redemption.validators";
import * as redemptionService from "@/services/redemption.service";

export const POST = withAuth(async (request, { supabase }) => {
  const body = await request.json();
  const result = validateCodeSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid input", zh: "输入无效" }, result.error.issues);
  }

  const validation = await redemptionService.validateCode(supabase, result.data.code);
  return successResponse(validation);
});
