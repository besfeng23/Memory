import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextUrl = new URL("/dashboard", requestUrl.origin);
  const failureUrl = new URL("/auth/login", requestUrl.origin);

  if (!code) {
    failureUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(failureUrl);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      failureUrl.searchParams.set("error", "callback_failed");
      return NextResponse.redirect(failureUrl);
    }

    return NextResponse.redirect(nextUrl);
  } catch {
    failureUrl.searchParams.set("error", "auth_unavailable");
    return NextResponse.redirect(failureUrl);
  }
}
