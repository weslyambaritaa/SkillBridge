import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicEnvironment } from "@/lib/env";
import { safeInternalPath } from "@/features/auth/authorization";
import { ensureAccountForCurrentUser } from "@/features/auth/data";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeInternalPath(request.nextUrl.searchParams.get("next"));
  const siteUrl = getPublicEnvironment()?.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "development" ? request.nextUrl.origin : null);

  if (!siteUrl) {
    return NextResponse.json({ error: "Authentication callback is not configured." }, { status: 500 });
  }

  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, siteUrl));

  if (!code) {
    return redirectTo("/login?error=confirmation");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectTo("/login?error=confirmation");
    }

    const account = await ensureAccountForCurrentUser(supabase);

    if (!account) {
      return redirectTo("/login?error=account");
    }

    return redirectTo(nextPath);
  } catch {
    return redirectTo("/login?error=configuration");
  }
}
