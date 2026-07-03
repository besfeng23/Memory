import { NextResponse, type NextRequest } from "next/server";
import { resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOperatorActionEvents, type OperatorActionDbClient } from "@/lib/services/pandora-operator-action-service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await resolvePandoraServerSession({ request }); if (!session.ok) return NextResponse.json({ ok: false, blockers: session.blockers }, { status: 401 });
  try { const { id } = await context.params; const supabase = await createSupabaseServerClient(); const events = await listOperatorActionEvents(supabase as unknown as OperatorActionDbClient, { userId: session.session.userId, actionId: id }); return NextResponse.json({ ok: true, events }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Action not found" }, { status: 404 }); }
}
