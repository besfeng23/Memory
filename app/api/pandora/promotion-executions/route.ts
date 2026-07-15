import { NextResponse, type NextRequest } from "next/server";
import { assertNoClientUserIdOverride, resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPromotionExecutions, type PromotionExecutionDbClient } from "@/lib/services/pandora-promotion-execution-service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { const rejected = await assertNoClientUserIdOverride(request, {}); if (rejected) return NextResponse.json({ ok:false, blockers: rejected.blockers }, { status: 400 }); const session = await resolvePandoraServerSession({ request }); if (!session.ok) return NextResponse.json({ ok:false, blockers: session.blockers }, { status: 401 }); try { const supabase = await createSupabaseServerClient(); const executions = await listPromotionExecutions(supabase as unknown as PromotionExecutionDbClient, { userId: session.session.userId }); return NextResponse.json({ ok:true, executions }); } catch(e) { return NextResponse.json({ ok:false, error: e instanceof Error ? e.message : "Unable to list promotion executions" }, { status: 400 }); } }
