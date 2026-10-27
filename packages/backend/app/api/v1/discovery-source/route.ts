import { withAuth } from "@/lib/with-auth";
import { successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { discoverySourceSchema } from "@/validators/discovery-source.validators";
import { getDiscoverySource, saveDiscoverySource } from "@/repositories/discovery-source.repository";

export const GET = withAuth(async (_request, { supabase }) => {
  return successResponse(await getDiscoverySource(supabase));
});

export const PUT = withAuth(async (request, { supabase }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid JSON", zh: "JSON 格式无效" });
  }
  const result = discoverySourceSchema.safeParse(body);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", { en: "Invalid discovery source", zh: "来源选项无效" });
  }
  return successResponse(await saveDiscoverySource(supabase, result.data));
});
