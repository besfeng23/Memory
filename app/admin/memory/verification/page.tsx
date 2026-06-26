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
        description="Read-only, authenticated/admin-only Phase 3F deployment recovery and production verification sealing dashboard."
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
        title="Phase 3F Closure Status"
        description="Compact close/no-close dashboard. Missing values are shown as not configured, unavailable, or blocked instead of crashing."
      >
        <ul>
          {dto.closureStatus.map((line) => (
            <Badge key={line.label} line={line} />
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Phase 3F Deployment Recovery"
        description="Deployment proof is env-backed only. Production closure is not complete until owner/operator verification is recorded. CI success is not the same as production verification."
      >
        <ul>
          <Badge line={dto.deploymentStatus.expectedReleaseSha} />
          <Badge line={dto.deploymentStatus.deployedCommitSha} />
          <Badge line={dto.deploymentStatus.deployedShaMatchesExpected} />
          <Badge line={dto.deploymentStatus.vercelEnvironment} />
          <Badge line={dto.deploymentStatus.vercelUrl} />
          <Badge line={dto.deploymentStatus.productionVerificationStatus} />
          <Badge line={dto.deploymentStatus.productionVerificationReviewer} />
          <Badge line={dto.deploymentStatus.productionVerificationAt} />
          <li><strong>Deployment verification state:</strong> {dto.deploymentStatus.deploymentVerificationState}</li>
          {dto.deploymentStatus.caveats.map((caveat) => (
            <li key={caveat}><strong>Deployment caveat:</strong> {caveat}</li>
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
        title="Phase 4A Controlled Persistence Readiness"
        description="Read-only foundation remains closed. Controlled persistence is disabled until reviewed write gate is enabled. Public writes remain forbidden."
      >
        <ul>
          <li><strong>proposal schema available:</strong> available via memory_proposals migration</li>
          <li><strong>proposal RLS available:</strong> authenticated user/namespace scoped, no anon policy</li>
          <li><strong>proposal route guard status:</strong> admin proposal routes require Supabase session and server-derived identity</li>
          <li><strong>reviewed persistence gate status:</strong> {runtime.config.approvedReviewPersistenceEnabled ? "enabled" : "disabled safe default"}</li>
          <li><strong>mutation endpoint status:</strong> POST/server-action only; blocked when gate is disabled</li>
          <li><strong>audit write proof status:</strong> proposal lifecycle writes audit_logs events</li>
          <li><strong>public write status:</strong> disabled</li>
          <li><strong>direct write status:</strong> disabled; browser remains read-only</li>
          <li><strong>proposal workflow status:</strong> {runtime.config.approvedReviewPersistenceEnabled ? "enabled" : "ready but disabled"}</li>
          <li><strong>Phase 3F read-only closure:</strong> closed</li>
          <li><strong>Phase 4A write feature:</strong> {runtime.config.approvedReviewPersistenceEnabled ? "enabled" : "disabled"}</li>
        </ul>
      </SectionCard>

      <SectionCard
        title="Phase 4A Daily ChatGPT Memory Bridge"
        description="Phase 4A bridge features are useful runtime additions. When disabled, they are not Phase 3F closure failures."
      >
        <ul>
          <li><strong>memory event schema:</strong> available via memory_events migration</li>
          <li><strong>context pack schema:</strong> available via memory_context_packs migration</li>
          <li><strong>capture API gate:</strong> {runtime.config.memoryCaptureApiEnabled ? "enabled" : "not enabled yet"}</li>
          <li><strong>context API gate:</strong> {runtime.config.memoryContextApiEnabled ? "enabled" : "not enabled yet"}</li>
          <li><strong>distillation gate:</strong> {runtime.config.memoryDistillationEnabled ? "enabled" : "not enabled yet"}</li>
          <li><strong>ChatGPT Action bridge gate:</strong> {runtime.config.chatgptActionBridgeEnabled ? "enabled" : "not enabled yet"}</li>
          <li><strong>public reads:</strong> disabled</li>
          <li><strong>public writes:</strong> disabled</li>
          <li><strong>model calls / embeddings / semantic retrieval / MCP:</strong> disabled</li>
          <li><strong>self-test:</strong> available at /admin/memory/bridge/self-test</li>
        </ul>
      </SectionCard>
      <SectionCard
        title="Runtime gate matrix"
        description="Every Pandora runtime gate, expected closure state, and closure impact."
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
