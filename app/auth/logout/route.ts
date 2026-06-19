import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Logout remains safe and idempotent if Supabase env is unavailable.
  }

  return NextResponse.redirect(new URL("/auth/login", request.url));
}

export const POST = GET;
