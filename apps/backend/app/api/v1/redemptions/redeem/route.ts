import { withAuth } from "@/lib/with-auth";
import { successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { redeemCodeSchema } from "@/validators/redemption.validators";
import * as redemptionService from "@/services/redemption.service";

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json();
  const result = redeemCodeSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid input", zh: "输入无效" }, result.error.issues);
  }

  const redemption = await redemptionService.redeemCode(
    supabase,
    user.id,
    result.data.code,
  );
  return successResponse(redemption, 201);
});
