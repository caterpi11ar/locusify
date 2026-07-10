import { withAuth } from "@/lib/with-auth";
import { successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { updateProfileSchema } from "@/validators/profile.validators";
import * as profileService from "@/services/profile.service";

export const GET = withAuth(async (_request, { supabase, user }) => {
  const profile = await profileService.getProfile(supabase, user.id);
  return successResponse(profile);
});

export const PATCH = withAuth(async (request, { supabase, user }) => {
  const body = await request.json();
  const result = updateProfileSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid input", zh: "输入无效" }, result.error.issues);
  }

  const profile = await profileService.updateProfile(supabase, user.id, result.data);
  return successResponse(profile);
});
