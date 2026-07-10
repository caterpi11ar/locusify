import { withAuth } from "@/lib/with-auth";
import { successResponse } from "@/lib/api-response";
import * as redemptionService from "@/services/redemption.service";

export const GET = withAuth(async (_request, { supabase, user }) => {
  const redemptions = await redemptionService.getRedemptionHistory(supabase, user.id);
  return successResponse(redemptions);
});
