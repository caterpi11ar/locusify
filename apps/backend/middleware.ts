import { NextRequest, NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

function getAllowedOrigin(origin: string | null): string | null {
  if (isDev) return "*";
  if (!origin) return null;
  const frontendUrl = process.env.FRONTEND_URL ?? "";
  const allowedOrigins = frontendUrl
    ? frontendUrl.split(",").map((o) => o.trim())
    : [];
  if (allowedOrigins.includes(origin)) return origin;
  return null;
}

function setCorsHeaders(
  response: NextResponse,
  origin: string | null,
): NextResponse {
  const allowedOrigin = getAllowedOrigin(origin);
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("Origin");

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    return setCorsHeaders(response, origin);
  }

  const response = NextResponse.next();
  return setCorsHeaders(response, origin);
}

export const config = {
  matcher: ["/api/:path*"],
};
