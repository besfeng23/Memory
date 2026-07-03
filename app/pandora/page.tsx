import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PandoraDashboard } from "@/components/pandora/PandoraDashboard";
import { resolvePandoraServerSession } from "@/lib/auth/pandora-server-session-resolver";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPandoraDashboardData, type PandoraDashboardDbClient } from "@/lib/services/pandora-dashboard-service";

export const dynamic = "force-dynamic";

export default async function PandoraPage() {
  const session = await resolvePandoraServerSession();
  const returnPath = "/pandora";
  const loginPath = `/auth/login?next=${encodeURIComponent(returnPath)}`;

  if (!session.ok) {
    return (
      <AppShell>
        <div className="page-stack">
          <PageHeader
            eyebrow="Internal Pandora dashboard"
            title="Operator session required."
            description="The Pandora dashboard shell is not a public proof page. It stays hidden until a server-derived Supabase session exists, and it must not expose memory namespaces, mock counts, or operational labels to anonymous visitors."
          />
          <SectionCard title="Start operator session" description="No memory dashboard content is rendered without authentication.">
            <div className="auth-status-panel">
              <StatusBadge status="blocked" />
              <div>
                <h3>Unauthenticated request blocked</h3>
                <p>Use a server-visible Supabase session before opening the Pandora dashboard. Dashboard reads are server-derived and reject client-supplied user_id values.</p>
                <div className="browser-state-grid">
                  {session.blockers.map((blocker) => (
                    <span className="browser-state-pill browser-state-pill--blocked" key={blocker.code}>{blocker.message}</span>
                  ))}
                </div>
                <div className="topbar__actions">
                  <Link className="button-link button-link--primary" href={loginPath}>Start operator session</Link>
                  <Link className="button-link" href="/api/session">Check session JSON</Link>
                  <Link className="button-link" href="/dashboard">Back to foundation dashboard</Link>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </AppShell>
    );
  }

  const supabase = await createSupabaseServerClient();
  const dashboardData = await loadPandoraDashboardData(supabase as unknown as PandoraDashboardDbClient, {
    userId: session.session.userId,
    operatorLabel: session.session.email ?? session.session.userId,
  });

  return <PandoraDashboard dashboardData={dashboardData} />;
}
