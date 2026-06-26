import { NextRequest, NextResponse } from "next/server";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveMemoryBridgePrincipal } from "@/lib/services/memory-bridge-auth";
import { listMemoryEvents } from "@/lib/services/memory-bridge-service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const runtime = resolvePandoraRuntimeSafetyConfig();
  const principal = await resolveMemoryBridgePrincipal(request);
  const supabase = await createSupabaseServerClient() as never;
  const result = await listMemoryEvents(supabase, { namespace: url.searchParams.get("namespace") ?? undefined, status: url.searchParams.get("status") ?? undefined, limit: Number(url.searchParams.get("limit") ?? 25) }, principal, runtime);
  if (!result.ok) return NextResponse.json({ ok: false, blockers: result.blockers, next_step: result.next_step }, { status: 403 });
  return NextResponse.json({ ok: true, events: result.data, blockers: [], next_step: "Use /api/memory/context for compact context." });
}
