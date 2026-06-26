/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveMemoryBridgePrincipal } from "@/lib/services/memory-bridge-auth";
import type { MemoryContextPack, MemoryEvent, MemoryBridgeNamespace } from "@/lib/services/memory-bridge-service";
import { compactContextResponse } from "@/lib/services/memory-distillation-service";
export const dynamic = "force-dynamic";
function ns(value?: string): MemoryBridgeNamespace | null { return !value ? "real_life" : value === "real_life" || value === "au" ? value : null; }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const runtime = resolvePandoraRuntimeSafetyConfig();
  if (!runtime.config.memoryContextApiEnabled) return NextResponse.json({ ok: false, blockers: ["memoryContextApiEnabled_disabled"], next_step: "Set PANDORA_ENABLE_MEMORY_CONTEXT_API=true." }, { status: 403 });
  const principal = await resolveMemoryBridgePrincipal(request);
  if (!principal.ok) return NextResponse.json({ ok: false, blockers: principal.blockers, next_step: "Authenticate as operator or use bridge bearer token." }, { status: 401 });
  const namespace = ns(body.namespace);
  if (!namespace) return NextResponse.json({ ok: false, blockers: ["namespace_required"], next_step: "Use real_life or au." }, { status: 400 });
  const supabase = await createSupabaseServerClient() as any;
  const packs = await (supabase.from("memory_context_packs").select("*").eq("user_id", principal.userId).eq("namespace", namespace).eq("status", "active").order("created_at", { ascending: false }).limit(1) as unknown as Promise<{ data: MemoryContextPack[] | null; error: { message: string } | null }>);
  const maxItems = Math.min(Math.max(Number(body.max_items ?? 8), 1), 20);
  const events = await (supabase.from("memory_events").select("*").eq("user_id", principal.userId).eq("namespace", namespace).neq("status", "archived").order("created_at", { ascending: false }).limit(maxItems) as unknown as Promise<{ data: MemoryEvent[] | null; error: { message: string } | null }>);
  if (packs.error || events.error) return NextResponse.json({ ok: false, blockers: ["context_read_failed"], warnings: [packs.error?.message, events.error?.message].filter(Boolean), next_step: "Check memory bridge schema and RLS." }, { status: 500 });
  const pack = compactContextResponse(packs.data?.[0] ?? null, events.data ?? [], body);
  return NextResponse.json({ ok: true, namespace, context_pack: pack, relevant_events: (events.data ?? []).map((event) => ({ id: event.id, source: event.source, summary: event.extracted_summary ?? event.raw_text.slice(0, 240), status: event.status })), confidence: packs.data?.[0] ? "pack" : "events_only", source_ids: [...(packs.data?.[0]?.generated_from_event_ids ?? []), ...(events.data ?? []).map((event) => event.id)].slice(0, 25), warnings: packs.data?.[0] ? [] : ["no_active_context_pack_yet"], safety: { public_read: false, write_available: false, model_calls: false, embeddings: false, semantic_retrieval: false } });
}
