import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/security/auth";
import { completedPrompts, coreImplementationStatus, documentationLinks, safetyRules } from "@/lib/app/status";

function StatusList({ items }: Readonly<{ items: typeof coreImplementationStatus }>) {
  return (
    <div className="item-grid">
      {items.map((item) => (
        <article className="status-item" key={item.title}>
          <StatusBadge status={item.status} />
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          {item.href ? <Link href={item.href}>Open reference</Link> : null}
        </article>
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow="Foundation dashboard"
          title="Implementation status without simulated memory data."
          description="This dashboard tracks completed foundation work and planned Pandora modules. It does not expose memory features because the memory engine and database schema are not implemented."
          actions={<><Link className="button-link" href="/api/health">View health endpoint</Link><Link className="button-link" href="/admin/memory/browser?namespace=real_life">Phase 3B Admin Browser</Link></>}
        />

        <SectionCard title="Authentication status" description="Server-side Supabase session lookup for the current request. No profile or memory records are loaded.">
          <div className="auth-status-panel">
            <StatusBadge status={user ? "implemented" : "foundation"} />
            <div>
              <h3>{user ? "Authenticated" : "Not authenticated"}</h3>
              <p>{user ? `Signed in as ${user.email ?? user.id}. Future memory APIs must derive ownership from this session user ID.` : "No Supabase Auth user is present for this request. The dashboard remains visible as a foundation status page."}</p>
              <div className="topbar__actions">
                <Link className="button-link" href="/auth/login">Login</Link>
                <Link className="button-link" href="/auth/logout">Logout</Link>
                <Link className="button-link" href="/api/session">Session API</Link>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Completed prompts" description="Work that exists in the repository today.">
          <StatusList items={completedPrompts} />
        </SectionCard>

        <SectionCard title="Phase 3B Admin Browser" description="Use this authenticated admin route for proof rows. The old /memory/browser public shell now redirects here and public reads remain disabled.">
          <Link className="doc-link" href="/admin/memory/browser?namespace=real_life"><span><strong>Open /admin/memory/browser?namespace=real_life</strong><small>Authenticated admin read-only browser for persisted memories, sources, patches, and audit trail. The public route is not a proof-row browser.</small></span><StatusBadge status="implemented" /></Link>
        </SectionCard>

        <SectionCard title="Not implemented yet" description="Required systems that remain planned and must not be implied as live.">
          <StatusList items={coreImplementationStatus} />
        </SectionCard>

        <section className="hero-grid">
          <SectionCard title="Safety rules" description="Rules future pages and APIs must preserve.">
            <StatusList items={safetyRules} />
          </SectionCard>
          <EmptyState
            title="Memory dashboards are deliberately empty."
            description="No fake metrics, users, worlds, scenes, relationships, risks, promises, deals, or audit logs are shown. Real cards can be added only after backed by implemented routes, schema, RLS, and retrieval logic."
          />
        </section>

        <SectionCard title="Documentation links" description="Reference contracts for future implementation tasks.">
          <div className="docs-list">
            {documentationLinks.map((doc) => (
              <Link className="doc-link" href={doc.href ?? "#"} key={doc.title}>
                <span><strong>{doc.title}</strong><small>{doc.description}</small></span>
                <StatusBadge status={doc.status} />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
