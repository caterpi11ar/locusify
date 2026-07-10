import { withAuth } from "@/lib/with-auth";
import { successResponse } from "@/lib/api-response";
import * as subscriptionService from "@/services/subscription.service";

export const GET = withAuth(async (_request, { supabase, user }) => {
  const result = await subscriptionService.getSubscriptionProviders(supabase, user.id);
  return successResponse(result);
});
