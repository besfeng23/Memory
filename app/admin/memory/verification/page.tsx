import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import {
  resolvePandoraServerSession,
  createRepositoryContextFromPandoraSession,
} from "@/lib/auth/pandora-server-session-resolver";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SupabasePersistedMemoryReadRepository } from "@/lib/db/supabase-persisted-memory-read-repository";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import {
  loadAdminMemoryVerification,
  type VerificationLine,
} from "@/lib/services/admin-memory-verification-loader";

export const dynamic = "force-dynamic";

const Badge = ({ line }: Readonly<{ line: VerificationLine }>) => (
  <li>
    <strong>{line.label}:</strong> {line.status} — {line.detail}
  </li>
);

export default async function AdminMemoryVerificationPage() {
  const namespace = "real_life";
  const session = await resolvePandoraServerSession();
  const context = createRepositoryContextFromPandoraSession({
    sessionResult: session,
    namespace,
  });
  const runtime = resolvePandoraRuntimeSafetyConfig();
  const supabase = await createSupabaseServerClient();
  const dto = await loadAdminMemoryVerification({
    session,
    context: context.ok ? context.context : { namespace },
    repository: new SupabasePersistedMemoryReadRepository(supabase as never),
    runtime,
  });
  const loginPath = `/auth/login?next=${encodeURIComponent("/admin/memory/verification")}`;
  return (
    <AppShell>
      <PageHeader
        eyebrow="Internal admin"
        title="Production memory verification"
        description="Read-only, authenticated/admin-only Phase 3E closure dashboard for production-safe memory proof."
      />
      {!session.ok ? (
        <SectionCard
          title="Authentication required"
          description="No persisted rows or proof data are exposed without a Supabase operator session."
        >
          <Link className="button-link button-link--primary" href={loginPath}>
            Start operator session
          </Link>
        </SectionCard>
      ) : null}
      <SectionCard
        title="Phase 3E Closure Status"
        description="Compact close/no-close dashboard. Missing values are shown as not configured, unavailable, or blocked instead of crashing."
      >
        <ul>
          {dto.closureStatus.map((line) => (
            <Badge key={line.label} line={line} />
          ))}
        </ul>
      </SectionCard>
      <SectionCard
        title="Safety summary"
        description="Read proof, public-read, route, and final recommendation signals."
      >
        <ul>
          <Badge line={dto.commitSha} />
          <Badge line={dto.persistedMemoryReadGateStatus} />
          <Badge line={dto.supabaseReadAvailability} />
          <Badge line={dto.memoryBrowserRouteStatus} />
          <Badge line={dto.auditRouteStatus} />
          <Badge line={dto.unsafeGateStatus} />
          <Badge line={dto.publicReadStatus} />
          <Badge line={dto.recommendation} />
        </ul>
      </SectionCard>
      <SectionCard
        title="Runtime gate matrix"
        description="Every Pandora runtime gate, expected Phase 3E state, and closure impact."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Gate key</th>
                <th>Env var</th>
                <th>Enabled</th>
                <th>Dangerous</th>
                <th>Closure impact</th>
                <th>Expected Phase 3E state</th>
              </tr>
            </thead>
            <tbody>
              {dto.runtimeGateMatrix.map((gate) => (
                <tr key={gate.gateKey}>
                  <td>{gate.gateKey}</td>
                  <td>{gate.envVarName}</td>
                  <td>{String(gate.enabled)}</td>
                  <td>{String(gate.dangerous)}</td>
                  <td>{gate.closureImpact}</td>
                  <td>{gate.expectedPhase3EState}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard
        title="Vercel/environment proof"
        description="Only configured/not-configured proof is displayed; secret values are never printed."
      >
        <ul>
          {dto.vercelEnvProof.map((line) => (
            <Badge key={line.label} line={line} />
          ))}
        </ul>
      </SectionCard>
      <SectionCard
        title="Manual verification checklist"
        description="Compact production checklist for closure review."
      >
        <ul>
          {dto.checklist.map((line) => (
            <Badge key={line.label} line={line} />
          ))}
        </ul>
      </SectionCard>
      <SectionCard
        title="Route guard consistency"
        description="All Phase 3D admin memory routes share these expectations: Supabase session, server-derived user context, namespace scope, and read-only behavior."
      >
        <ul>
          {dto.guardExpectations.map((guard) => (
            <li key={guard.route}>
              <strong>{guard.route}</strong>: authenticated=
              {String(guard.authenticatedSupabaseSessionRequired)}, adminOnly=
              {String(guard.adminOnly)}, readOnly={String(guard.readOnly)},
              namespaceScoped={String(guard.namespaceScoped)},
              serverDerivedUserOnly={String(guard.serverDerivedUserOnly)},
              publicReadAllowed={String(guard.publicReadAllowed)},
              serviceRoleAllowed={String(guard.serviceRoleAllowed)},
              mutationAllowed={String(guard.mutationAllowed)}
            </li>
          ))}
        </ul>
      </SectionCard>
    </AppShell>
  );
}
