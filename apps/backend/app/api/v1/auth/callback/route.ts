import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { provisionUser } from "@/services/provision.service";
import { isAllowedRedirectUri } from "@/lib/redirect";

function clearRedirectCookie(response: NextResponse): void {
  response.cookies.set("oauth_redirect_uri", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get("oauth_redirect_uri")?.value;
  if (!cookieValue || !isAllowedRedirectUri(cookieValue)) {
    return NextResponse.json({ error: "missing_or_invalid_redirect_uri" }, { status: 400 });
  }
  const redirectUri = cookieValue;

  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");

    if (!code) {
      const response = NextResponse.redirect(`${redirectUri}?error=missing_code`);
      clearRedirectCookie(response);
      return response;
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      const response = NextResponse.redirect(`${redirectUri}?error=exchange_failed`);
      clearRedirectCookie(response);
      return response;
    }

    await provisionUser(data.session.user);

    const params = new URLSearchParams({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    const response = NextResponse.redirect(`${redirectUri}?${params.toString()}`);
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    clearRedirectCookie(response);

    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    const response = NextResponse.redirect(`${redirectUri}?error=internal_error`);
    clearRedirectCookie(response);
    return response;
  }
}
