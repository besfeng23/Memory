import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { MemoryBrowserShell } from "@/components/memory-browser/MemoryBrowserShell";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { resolvePandoraServerSession, createRepositoryContextFromPandoraSession } from "@/lib/auth/pandora-server-session-resolver";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { SupabasePersistedMemoryReadRepository } from "@/lib/db/supabase-persisted-memory-read-repository";
import { loadPersistedMemoryBrowserView } from "@/lib/services/persisted-memory-browser-loader";
import type { PersistedMemoryNamespace } from "@/lib/services/persisted-memory-read-contract";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>;

function param(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return typeof value === "string" ? value : undefined;
}

export default async function AdminMemoryBrowserPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const namespace = param(params, "namespace") as PersistedMemoryNamespace | undefined;
  const returnPath = `/admin/memory/browser?namespace=${encodeURIComponent(namespace ?? "real_life")}`;
  const loginPath = `/auth/login?next=${encodeURIComponent(returnPath)}`;
  const baseRuntime = resolvePandoraRuntimeSafetyConfig();
  const runtime = {
    ...baseRuntime,
    config: { ...baseRuntime.config, persistedMemoryReadEnabled: true },
    gates: {
      ...baseRuntime.gates,
      persistedMemoryReadEnabled: {
        ...baseRuntime.gates.persistedMemoryReadEnabled,
        enabled: true,
        envVar: "ADMIN_ROUTE_INTERNAL_READ_ONLY",
        dangerous: false,
      },
    },
  };
  const session = await resolvePandoraServerSession();
  const context = createRepositoryContextFromPandoraSession({ sessionResult: session, namespace });
  const supabase = await createSupabaseServerClient();

  const viewModel = await loadPersistedMemoryBrowserView({
    authenticated: session.ok,
    context: context.ok ? context.context : { namespace },
    runtime,
    repository: new SupabasePersistedMemoryReadRepository(supabase as never),
    selectedItemId: param(params, "itemId"),
    filters: {
      namespace,
      keyword: param(params, "keyword"),
      sourceId: param(params, "sourceId"),
      memoryKind: param(params, "memoryKind"),
      createdFrom: param(params, "createdFrom"),
      createdTo: param(params, "createdTo"),
      sourceType: param(params, "sourceType"),
      proofStatus: param(params, "proofStatus"),
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Internal admin"
        title="Gated memory browser"
        description="Read-only, logged-in Supabase-session, namespace-scoped browser for persisted memory metadata, source proof, patch proof, and audit proof. Retrieval, MCP, model calls, embeddings, GPT Actions, public reads, and public persistence remain disabled."
      />
      {!session.ok ? (
        <SectionCard title="Start operator session" description="You are on the correct Phase 3B page. Start a temporary Supabase session, then the app will return here automatically.">
          <p>Until a server-visible Supabase session exists, memory rows stay hidden. This protects the proof data from public reads.</p>
          <div className="topbar__actions">
            <Link className="button-link button-link--primary" href={loginPath}>Start operator session</Link>
            <Link className="button-link" href="/api/session">Check session JSON</Link>
          </div>
        </SectionCard>
      ) : null}
      <MemoryBrowserShell viewModel={viewModel} />
    </AppShell>
  );
}
