import { NextResponse, type NextRequest } from "next/server";
import { assertNoClientUserIdOverride, resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listShadowContextPacks, type ShadowContextPackDbClient } from "@/lib/services/pandora-shadow-context-pack-service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { const rejected = await assertNoClientUserIdOverride(request); if (rejected) return NextResponse.json({ ok: false, blockers: rejected.blockers }, { status: 400 }); const session = await resolvePandoraServerSession({ request }); if (!session.ok) return NextResponse.json({ ok: false, blockers: session.blockers }, { status: 401 }); const url = new URL(request.url); const supabase = await createSupabaseServerClient(); const packs = await listShadowContextPacks(supabase as unknown as ShadowContextPackDbClient, { userId: session.session.userId, namespace: url.searchParams.get("namespace") ?? undefined, status: url.searchParams.get("status") ?? undefined, limit: 25 }); return NextResponse.json({ ok: true, packs }); }
