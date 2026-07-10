import { withAuth } from "@/lib/with-auth";
import { successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { createFeedbackSchema } from "@/validators/feedback.validators";
import * as feedbackService from "@/services/feedback.service";

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json();
  const result = createFeedbackSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid input", zh: "输入无效" }, result.error.issues);
  }

  const record = await feedbackService.createFeedback(supabase, user.id, result.data);
  return successResponse(record, 201);
});

