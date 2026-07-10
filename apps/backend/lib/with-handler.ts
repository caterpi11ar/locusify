import { NextRequest, NextResponse } from "next/server";
import { handleError } from "./api-response";

type RouteContext = { params: Promise<Record<string, string>> };

export function withHandler(
  handler: (
    request: NextRequest,
    context: RouteContext,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      return await handler(request, context);
    } catch (err) {
      return handleError(err);
    }
  };
}
