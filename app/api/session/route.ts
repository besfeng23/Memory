import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email ?? null,
      created_at: user.created_at ?? null,
    },
  });
}
