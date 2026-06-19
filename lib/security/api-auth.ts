import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/security/auth";

export type ApiAuthErrorCode = "unauthenticated" | "forbidden";

export function unauthorizedResponse(message = "Authentication required.") {
  return NextResponse.json(
    { ok: false, error: { code: "unauthenticated" satisfies ApiAuthErrorCode, message } },
    { status: 401 },
  );
}

export function forbiddenResponse(message = "Forbidden.") {
  return NextResponse.json(
    { ok: false, error: { code: "forbidden" satisfies ApiAuthErrorCode, message } },
    { status: 403 },
  );
}

export async function requireApiUser(): Promise<{ user: User; response: null } | { user: null; response: ReturnType<typeof unauthorizedResponse> }> {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, response: unauthorizedResponse() };
  }

  return { user, response: null };
}
