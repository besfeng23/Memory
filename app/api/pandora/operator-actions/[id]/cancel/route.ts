import { NextResponse, type NextRequest } from "next/server";
import { assertNoClientUserIdOverride, resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelOperatorAction, type OperatorActionDbClient } from "@/lib/services/pandora-operator-action-service";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let body: unknown; try { body = await request.json(); } catch { body = {}; }
  const rejected = await assertNoClientUserIdOverride(request, body); if (rejected) return NextResponse.json({ ok: false, blockers: rejected.blockers }, { status: 400 });
  const session = await resolvePandoraServerSession({ request }); if (!session.ok) return NextResponse.json({ ok: false, blockers: session.blockers }, { status: 401 });
  try { const { id } = await context.params; const supabase = await createSupabaseServerClient(); const action = await cancelOperatorAction(supabase as unknown as OperatorActionDbClient, { userId: session.session.userId, actionId: id }); return NextResponse.json({ ok: true, action }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Action not found" }, { status: 400 }); }
}
