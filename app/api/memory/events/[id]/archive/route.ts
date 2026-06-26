import { NextRequest, NextResponse } from "next/server";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveMemoryBridgePrincipal } from "@/lib/services/memory-bridge-auth";
import { updateMemoryEventStatus } from "@/lib/services/memory-bridge-service";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const runtime = resolvePandoraRuntimeSafetyConfig();
  const principal = await resolveMemoryBridgePrincipal(request);
  const supabase = await createSupabaseServerClient() as never;
  const result = await updateMemoryEventStatus(supabase, id, "archived", { namespace: body.namespace }, principal, runtime);
  if (!result.ok) return NextResponse.json({ ok: false, blockers: result.blockers, next_step: result.next_step }, { status: 403 });
  return NextResponse.json({ ok: true, event_id: result.data.id, status: result.data.status, blockers: [], next_step: "Status change audited." });
}
