import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { errorResponse, handleError } from "@/lib/api-response";
import { isAllowedRedirectUri } from "@/lib/redirect";

const SUPPORTED_PROVIDERS = ["google", "github"] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;

    const redirectUri = request.nextUrl.searchParams.get("redirect_uri");
    if (!redirectUri) {
      return errorResponse(
        "VALIDATION_ERROR",
        { en: "redirect_uri is required", zh: "redirect_uri 为必填项" },
        400,
      );
    }
    if (!isAllowedRedirectUri(redirectUri)) {
      return errorResponse(
        "VALIDATION_ERROR",
        { en: "Invalid redirect_uri", zh: "无效的 redirect_uri" },
        400,
      );
    }

    if (!SUPPORTED_PROVIDERS.includes(provider as Provider)) {
      return errorResponse(
        "VALIDATION_ERROR",
        { en: `Invalid provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(", ")}`, zh: `无效的提供商: ${provider}。支持: ${SUPPORTED_PROVIDERS.join(", ")}` },
        400,
      );
    }

    const pendingCookies: { name: string; value: string; options: object }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookies) {
            pendingCookies.push(...cookies);
          },
        },
      },
    );

    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/api/v1/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: { redirectTo },
    });

    if (error || !data.url) {
      return errorResponse(
        "INTERNAL_ERROR",
        { en: "Failed to initiate OAuth flow", zh: "OAuth 登录发起失败" },
        500,
      );
    }

    const response = NextResponse.redirect(data.url);
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    response.cookies.set("oauth_redirect_uri", redirectUri, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (err) {
    return handleError(err);
  }
}
