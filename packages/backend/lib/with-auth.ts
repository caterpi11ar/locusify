import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { requireAuth } from "./auth-guard";
import { handleError } from "./api-response";

interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

type RouteContext = { params: Promise<Record<string, string>> };

export function withAuth(
  handler: (
    request: NextRequest,
    auth: AuthContext,
    context: RouteContext,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      const auth = await requireAuth(request);
      return await handler(request, auth, context);
    } catch (err) {
      return handleError(err);
    }
  };
}
