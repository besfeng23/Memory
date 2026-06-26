/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isBridgeTokenConfigured } from "@/lib/services/memory-bridge-auth";
import type { MemoryContextPack, MemoryEvent } from "@/lib/services/memory-bridge-service";
import { compactContextResponse } from "@/lib/services/memory-distillation-service";
import { captureBridgeMemoryAction, distillBridgeContextAction } from "./actions";
export const dynamic = "force-dynamic";
export default async function Page() {
  const runtime = resolvePandoraRuntimeSafetyConfig();
  const session = await resolvePandoraServerSession();
  const namespace = "real_life";
  const supabase = await createSupabaseServerClient() as any;
  const events = session.ok ? await (supabase.from("memory_events").select("*").eq("user_id", session.session.userId).eq("namespace", namespace).order("created_at", { ascending: false }).limit(10) as unknown as Promise<{ data: MemoryEvent[] | null }>) : { data: [] };
  const packs = session.ok ? await (supabase.from("memory_context_packs").select("*").eq("user_id", session.session.userId).eq("namespace", namespace).eq("status", "active").order("created_at", { ascending: false }).limit(1) as unknown as Promise<{ data: MemoryContextPack[] | null }>) : { data: [] };
  const latestPack = packs.data?.[0] ?? null;
  const promptPack = compactContextResponse(latestPack, events.data ?? [], { include_people: true, include_projects: true, include_risks: true });
  const copyPrompt = `Use this Pandora context for this conversation:\n${JSON.stringify(promptPack, null, 2)}`;
  return <AppShell><PageHeader eyebrow="Internal admin" title="Daily ChatGPT memory bridge" description="Capture everyday memory events, distill context packs, and copy or serve compact context to ChatGPT without public reads, embeddings, semantic retrieval, model calls, GPT Actions-by-default, or MCP." />
    <SectionCard title="API bridge status" description="Disabled gates are not Phase 3F failures; they mean the bridge is not enabled yet."><ul><li>capture API: {String(runtime.config.memoryCaptureApiEnabled)}</li><li>context API: {String(runtime.config.memoryContextApiEnabled)}</li><li>distillation: {String(runtime.config.memoryDistillationEnabled)}</li><li>ChatGPT action bridge: {String(runtime.config.chatgptActionBridgeEnabled)}</li><li>bridge token configured: {String(isBridgeTokenConfigured())}</li><li>public reads: {String(runtime.config.publicMemoryReadEnabled)}</li><li>public writes: {String(runtime.config.publicMemoryPersistenceEnabled)}</li></ul><Link className="button-link" href="/pandora-memory-openapi.json">OpenAPI JSON</Link> <Link className="button-link" href="/admin/memory/bridge/self-test">Run self-test</Link></SectionCard>
    <SectionCard title="Capture memory" description="Authenticated operator capture only. Every capture is audited."><form action={captureBridgeMemoryAction} className="memory-browser-filter-form"><input type="hidden" name="namespace" value="real_life"/><label>Source<select name="source" defaultValue="chatgpt_manual"><option value="chatgpt_manual">chatgpt_manual</option><option value="operator_note">operator_note</option><option value="project_update">project_update</option><option value="relationship_observation">relationship_observation</option><option value="business_decision">business_decision</option></select></label><label>Importance<input name="importance" type="number" min="0" max="10" defaultValue="5"/></label><label>Sensitivity<select name="sensitivity" defaultValue="medium"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="private">private</option></select></label><label>Memory text<textarea name="raw_text" required/></label><button disabled={!runtime.config.memoryCaptureApiEnabled}>Capture memory event</button></form></SectionCard>
    <SectionCard title="Recent memory events" description="Reviewable captured events."><ul>{(events.data ?? []).map((event) => <li key={event.id}>{event.status} — {event.source} — {event.raw_text.slice(0, 160)}</li>)}</ul></SectionCard>
    <SectionCard title="Generate context pack" description="Deterministic no-model distillation."><form action={distillBridgeContextAction}><input type="hidden" name="namespace" value="real_life"/><button name="pack_type" value="daily" disabled={!runtime.config.memoryDistillationEnabled}>Generate daily context pack</button><button name="pack_type" value="master" disabled={!runtime.config.memoryDistillationEnabled}>Generate master context pack</button></form></SectionCard>
    <SectionCard title="Latest context pack preview" description="Copy this fallback prompt into any normal ChatGPT chat."><p>{latestPack?.title ?? "No active context pack yet."}</p><pre>{latestPack?.summary ?? "Capture and distill events to create a context pack."}</pre><label>ChatGPT context pack<textarea readOnly value={copyPrompt} rows={12}/></label></SectionCard>
  </AppShell>;
}
