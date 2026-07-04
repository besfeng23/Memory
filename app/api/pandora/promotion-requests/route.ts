import { NextResponse, type NextRequest } from "next/server";
import { assertNoClientUserIdOverride, resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPromotionRequests, type PromotionRequestDbClient } from "@/lib/services/pandora-promotion-request-service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { const rejected = await assertNoClientUserIdOverride(request); if (rejected) return NextResponse.json({ ok:false, blockers: rejected.blockers }, { status: 400 }); const session = await resolvePandoraServerSession({ request }); if (!session.ok) return NextResponse.json({ ok:false, blockers: session.blockers }, { status: 401 }); const { searchParams } = new URL(request.url); const supabase = await createSupabaseServerClient(); const requests = await listPromotionRequests(supabase as unknown as PromotionRequestDbClient, { userId: session.session.userId, namespace: searchParams.get("namespace") ?? undefined, status: searchParams.get("status") ?? undefined, limit: 25 }); return NextResponse.json({ ok:true, requests }); }
