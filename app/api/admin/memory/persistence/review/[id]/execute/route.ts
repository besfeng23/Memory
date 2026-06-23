import { NextResponse, type NextRequest } from "next/server";
import { blockedResult } from "@/lib/api/admin-persistence-console-dto";
function hasClientUserId(request: NextRequest) { const url = new URL(request.url); return url.searchParams.has("user_id") || url.searchParams.has("userId"); }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (hasClientUserId(request) || body.user_id || body.userId) return NextResponse.json(blockedResult("Client user_id/userId is not accepted.", ["client_user_id_override_attempt"]), { status: 400 });
  return NextResponse.json(blockedResult("Admin persistence console is disabled. Approved-review persistence execution is internal-gated. Public production persistence is not enabled.", ["admin_console_disabled", "internal_gate_required", "public_production_persistence_disabled"]), { status: 501 });
}
