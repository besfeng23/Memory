import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { MemoryAuditTrail } from "@/components/memory-browser/MemoryAuditTrail";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { resolvePandoraServerSession, createRepositoryContextFromPandoraSession } from "@/lib/auth/pandora-server-session-resolver";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { SupabasePersistedMemoryReadRepository } from "@/lib/db/supabase-persisted-memory-read-repository";
import { toBrowserAuditView } from "@/lib/api/persisted-memory-browser-dto";
import type { PersistedMemoryNamespace } from "@/lib/services/persisted-memory-read-contract";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type PageProps = Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>;
const param = (params: Record<string, string | string[] | undefined> | undefined, key: string) => typeof params?.[key] === "string" ? params[key] : undefined;

export default async function AdminMemoryAuditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const namespace = (param(params, "namespace") ?? "real_life") as PersistedMemoryNamespace;
  const session = await resolvePandoraServerSession();
  const context = createRepositoryContextFromPandoraSession({ sessionResult: session, namespace });
  const runtime = resolvePandoraRuntimeSafetyConfig();
  let events = [] as ReturnType<typeof toBrowserAuditView>[];
  let blocker: string | undefined;
  if (session.ok && context.ok) {
    const supabase = await createSupabaseServerClient();
    const result = await new SupabasePersistedMemoryReadRepository(supabase as never).listMemoryAuditEvents(context.context, { namespace, filter: { createdFrom: param(params, "createdFrom"), createdTo: param(params, "createdTo"), sourceType: param(params, "sourceType"), proofStatus: param(params, "proofStatus") } });
    if (result.ok) events = result.items.map(toBrowserAuditView); else blocker = result.blocker.message;
  }
  return <AppShell><PageHeader eyebrow="Internal admin" title="Read-only memory audit viewer" description="Admin-only audit proof route. It does not expose write, patch, delete, persistence, retrieval, embedding, model, GPT Actions, MCP, or public-read controls." />{!session.ok ? <SectionCard title="Authentication required" description="Unauthenticated users cannot view persisted memory audit data."><Link className="button-link button-link--primary" href={`/auth/login?next=${encodeURIComponent(`/admin/memory/audit?namespace=${namespace}`)}`}>Start operator session</Link></SectionCard> : null}<SectionCard title="Audit filters" description="URL-backed read-only filters."><form className="memory-browser-filter-form"><label>Namespace <select name="namespace" defaultValue={namespace}><option value="real_life">real_life</option><option value="au">au</option></select></label><label>Created from <input name="createdFrom" defaultValue={param(params, "createdFrom") ?? ""} /></label><label>Created to <input name="createdTo" defaultValue={param(params, "createdTo") ?? ""} /></label><label>Source type <input name="sourceType" defaultValue={param(params, "sourceType") ?? ""} /></label><label>Proof status <input name="proofStatus" defaultValue={param(params, "proofStatus") ?? ""} /></label><button className="button-link" type="submit">Apply read-only filters</button></form><p>Unsafe production writes enabled: {String(runtime.config.ingestProductionWriteEnabled || runtime.config.approvedReviewPersistenceEnabled)}</p></SectionCard>{blocker ? <SectionCard title="Audit unavailable" description="The audit table or fields may be missing or inaccessible through RLS."><p>{blocker}</p><p>Required fields: id, created_at, user_id, action, namespace, record_id, source/proof metadata where available.</p></SectionCard> : null}<MemoryAuditTrail events={events} /></AppShell>;
}
