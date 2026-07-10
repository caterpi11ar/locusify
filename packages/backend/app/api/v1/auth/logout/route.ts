import { withAuth } from "@/lib/with-auth";
import { successResponse } from "@/lib/api-response";

export const POST = withAuth(async (_request, { supabase }) => {
  await supabase.auth.signOut();
  return successResponse({ message: "Logged out successfully" });
});
