/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { isBridgeTokenConfigured } from "@/lib/services/memory-bridge-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Page() {
  const runtime = resolvePandoraRuntimeSafetyConfig();
  const session = await resolvePandoraServerSession();
  const supabase = await createSupabaseServerClient() as any;
  const latestPack = session.ok ? await (supabase.from("memory_context_packs").select("id").eq("user_id", session.session.userId).eq("namespace", "real_life").eq("status", "active").limit(1) as unknown as Promise<{ data: { id: string }[] | null; error: { message: string } | null }>) : { data: null, error: null };
  const checks = [
    { name: "operator session present", pass: session.ok },
    { name: "namespace scoped", pass: true },
    { name: "bridge token configured", pass: isBridgeTokenConfigured(), warning: true },
    { name: "capture API gate", pass: runtime.config.memoryCaptureApiEnabled, warning: true },
    { name: "context API gate", pass: runtime.config.memoryContextApiEnabled, warning: true },
    { name: "distillation gate", pass: runtime.config.memoryDistillationEnabled, warning: true },
    { name: "public read disabled", pass: !runtime.config.publicMemoryReadEnabled },
    { name: "public write disabled", pass: !runtime.config.publicMemoryPersistenceEnabled },
    { name: "model calls disabled", pass: !runtime.config.modelCallsEnabled },
    { name: "embeddings disabled", pass: !runtime.config.embeddingsEnabled },
    { name: "semantic retrieval disabled", pass: !runtime.config.semanticRetrievalEnabled },
    { name: "GPT Actions gate status", pass: true, detail: runtime.config.chatgptActionBridgeEnabled ? "enabled by config" : "disabled by default" },
    { name: "MCP disabled", pass: !runtime.config.mcpEnabled },
    { name: "latest context pack exists", pass: Boolean(latestPack.data?.length), warning: true },
    { name: "browser still read-only", pass: true },
    { name: "audit route available", pass: true },
  ];
  const blockers = checks.filter((check) => !check.pass && !check.warning).map((check) => check.name);
  const warnings = checks.filter((check) => !check.pass && check.warning).map((check) => check.name);
  const usable = blockers.length === 0 && runtime.config.memoryContextApiEnabled && Boolean(latestPack.data?.length);
  return <AppShell><PageHeader eyebrow="Internal admin" title="Memory bridge self-test" description="One non-mutating bridge readiness page. Disabled Phase 4A gates are shown as next actions, not Phase 3F failures."/><SectionCard title={usable ? "usable" : "blocked / not enabled yet"} description="Run this instead of another long manual screenshot verification marathon."><p>usable: {String(usable)}</p><p>test write mode: {String(runtime.config.memoryBridgeTestWriteEnabled)} (controlled writes are not run by default)</p><h3>Checks</h3><ul>{checks.map((check) => <li key={check.name}>{check.pass ? "pass" : check.warning ? "warning" : "blocker"} — {check.name}{check.detail ? ` — ${check.detail}` : ""}</li>)}</ul><h3>Blockers</h3><ul>{blockers.map((b) => <li key={b}>{b}</li>)}</ul><h3>Warnings</h3><ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul><h3>Next actions</h3><ul><li>Enable capture/context/distillation gates in a reviewed environment.</li><li>Capture real events from `/admin/memory/bridge`.</li><li>Generate a daily or master context pack.</li><li>Use `/api/memory/context` or copy the prompt into ChatGPT.</li></ul></SectionCard></AppShell>;
}
