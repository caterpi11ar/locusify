import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";

export const GET = withHandler(async () => {
  return successResponse({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});
