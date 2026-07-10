import { withAuth } from "@/lib/with-auth";
import { successResponse } from "@/lib/api-response";

export const GET = withAuth(async (_request, { user }) => {
  return successResponse({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
  });
});
