import { NextResponse, type NextRequest } from "next/server";
import { assertNoClientUserIdOverride, resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOperatorActions, proposeOperatorAction, type OperatorActionDbClient } from "@/lib/services/pandora-operator-action-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await resolvePandoraServerSession({ request });
  if (!session.ok) return NextResponse.json({ ok: false, blockers: session.blockers }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const actions = await listOperatorActions(supabase as unknown as OperatorActionDbClient, { userId: session.session.userId, limit: 25 });
  return NextResponse.json({ ok: true, actions });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { body = {}; }
  const rejected = await assertNoClientUserIdOverride(request, body);
  if (rejected) return NextResponse.json({ ok: false, blockers: rejected.blockers }, { status: 400 });
  const session = await resolvePandoraServerSession({ request });
  if (!session.ok) return NextResponse.json({ ok: false, blockers: session.blockers }, { status: 401 });
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  try {
    const supabase = await createSupabaseServerClient();
    const action = await proposeOperatorAction(supabase as unknown as OperatorActionDbClient, { userId: session.session.userId, actionType: String(input.action_type ?? ""), namespace: typeof input.namespace === "string" ? input.namespace : null, mode: typeof input.mode === "string" ? input.mode : "dry_run", payload: input.payload && typeof input.payload === "object" ? input.payload as Record<string, unknown> : {} });
    return NextResponse.json({ ok: true, action });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invalid operator action" }, { status: 400 });
  }
}
