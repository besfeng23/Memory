/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveMemoryBridgePrincipal } from "@/lib/services/memory-bridge-auth";
import type { MemoryBridgeNamespace, MemoryEvent } from "@/lib/services/memory-bridge-service";
import { createContextPack } from "@/lib/services/memory-bridge-service";
import { buildDailyContextPack, buildMasterContextPack } from "@/lib/services/memory-distillation-service";
export const dynamic = "force-dynamic";
function ns(value?: string): MemoryBridgeNamespace | null { return !value ? "real_life" : value === "real_life" || value === "au" ? value : null; }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const runtime = resolvePandoraRuntimeSafetyConfig();
  if (!runtime.config.memoryDistillationEnabled) return NextResponse.json({ ok: false, blockers: ["memoryDistillationEnabled_disabled"], next_step: "Set PANDORA_ENABLE_MEMORY_DISTILLATION=true." }, { status: 403 });
  const principal = await resolveMemoryBridgePrincipal(request);
  if (!principal.ok) return NextResponse.json({ ok: false, blockers: principal.blockers, next_step: "Authenticate as operator or use bridge bearer token." }, { status: 401 });
  const namespace = ns(body.namespace);
  if (!namespace) return NextResponse.json({ ok: false, blockers: ["namespace_required"], next_step: "Use real_life or au." }, { status: 400 });
  const supabase = await createSupabaseServerClient() as any;
  const events = await (supabase.from("memory_events").select("*").eq("user_id", principal.userId).eq("namespace", namespace).neq("status", "archived").order("created_at", { ascending: false }).limit(body.pack_type === "master" ? 50 : 25) as unknown as Promise<{ data: MemoryEvent[] | null; error: { message: string } | null }>);
  if (events.error) return NextResponse.json({ ok: false, blockers: ["event_read_failed"], warnings: [events.error.message], next_step: "Check memory_events schema and RLS." }, { status: 500 });
  const pack = body.pack_type === "master" ? buildMasterContextPack(namespace, principal.userId, events.data ?? []) : buildDailyContextPack(namespace, principal.userId, events.data ?? []);
  const result = await createContextPack(supabase, pack, principal, runtime);
  if (!result.ok) return NextResponse.json({ ok: false, blockers: result.blockers, warnings: result.warnings, next_step: result.next_step }, { status: 403 });
  return NextResponse.json({ ok: true, pack_id: result.data.id, pack_type: result.data.pack_type, summary: result.data.summary, blockers: [], next_step: "Use /api/memory/context or copy the admin bridge context prompt." });
}
