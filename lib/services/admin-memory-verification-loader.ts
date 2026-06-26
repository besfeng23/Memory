import {
  resolvePandoraRuntimeSafetyConfig,
  type PandoraRuntimeGate,
  type PandoraRuntimeSafetyConfigResult,
} from "@/lib/config/pandora-runtime-safety-config";
import { loadPersistedMemoryBrowserView } from "@/lib/services/persisted-memory-browser-loader";
import type { PersistedMemoryReadRepository } from "@/lib/db/persisted-memory-read-repository-contract";
import type { PersistedMemoryReadContext } from "@/lib/services/persisted-memory-read-contract";
import type { PandoraServerSessionResult } from "@/lib/auth/pandora-server-session-contract";
import { adminMemoryRouteGuardExpectations } from "@/lib/services/admin-memory-route-guard-contract";

export type VerificationStatus =
  | "available"
  | "not configured"
  | "unavailable"
  | "blocked"
  | "disabled";
export type VerificationLine = {
  label: string;
  status: VerificationStatus;
  detail: string;
};
export type DeploymentVerificationState =
  | "not configured"
  | "pending deployment"
  | "deployed but unverified"
  | "verified manually required"
  | "blocked";
export type DeploymentStatusDto = {
  deployedCommitSha: VerificationLine;
  expectedReleaseSha: VerificationLine;
  deployedShaMatchesExpected: VerificationLine;
  vercelEnvironment: VerificationLine;
  vercelUrl: VerificationLine;
  productionVerificationStatus: VerificationLine;
  productionVerificationReviewer: VerificationLine;
  productionVerificationAt: VerificationLine;
  deploymentVerificationState: DeploymentVerificationState;
  caveats: string[];
};
export type RuntimeGateMatrixRow = {
  gateKey: PandoraRuntimeGate;
  envVarName: string;
  enabled: boolean;
  dangerous: boolean;
  closureImpact: string;
  expectedPhase3EState: string;
};
export type AdminMemoryVerificationDto = {
  readOnly: true;
  route: "/admin/memory/verification";
  commitSha: VerificationLine;
  deploymentStatus: DeploymentStatusDto;
  vercelEnvProof: VerificationLine[];
  persistedMemoryReadGateStatus: VerificationLine;
  supabaseReadAvailability: VerificationLine;
  memoryBrowserRouteStatus: VerificationLine;
  auditRouteStatus: VerificationLine;
  unsafeGateStatus: VerificationLine;
  publicReadStatus: VerificationLine;
  closureStatus: VerificationLine[];
  runtimeGateMatrix: RuntimeGateMatrixRow[];
  recommendation: VerificationLine & {
    closeRecommended: boolean;
    blockers: string[];
  };
  checklist: VerificationLine[];
  guardExpectations: typeof adminMemoryRouteGuardExpectations;
};

const runtimeGateKeys: PandoraRuntimeGate[] = [
  "persistedMemoryReadEnabled",
  "adminPersistenceConsoleEnabled",
  "approvedReviewPersistenceEnabled",
  "operatorQaFlowEnabled",
  "ingestProductionWriteEnabled",
  "publicMemoryReadEnabled",
  "publicMemoryPersistenceEnabled",
  "modelCallsEnabled",
  "embeddingsEnabled",
  "semanticRetrievalEnabled",
  "gptActionsEnabled",
  "mcpEnabled",
];
type RiskGate = Exclude<PandoraRuntimeGate, "persistedMemoryReadEnabled" | "memoryCaptureApiEnabled" | "memoryContextApiEnabled" | "memoryDistillationEnabled" | "chatgptActionBridgeEnabled" | "memoryBridgeTestWriteEnabled">;
const riskGateLabels: Record<RiskGate, string> = {
  adminPersistenceConsoleEnabled: "adminPersistenceConsoleEnabled",
  approvedReviewPersistenceEnabled: "approvedReviewPersistenceEnabled",
  operatorQaFlowEnabled: "operatorQaFlowEnabled",
  ingestProductionWriteEnabled: "ingestProductionWriteEnabled",
  publicMemoryReadEnabled: "publicMemoryReadEnabled",
  publicMemoryPersistenceEnabled: "publicMemoryPersistenceEnabled",
  modelCallsEnabled: "modelCallsEnabled",
  embeddingsEnabled: "embeddingsEnabled",
  semanticRetrievalEnabled: "semanticRetrievalEnabled",
  gptActionsEnabled: "gptActionsEnabled",
  mcpEnabled: "mcpEnabled",
};
const riskGates = Object.keys(riskGateLabels) as RiskGate[];

const value = (v?: string) => (v && v.trim() ? v : undefined);
const configured = (
  label: string,
  envVar: string,
  env: Partial<NodeJS.ProcessEnv>,
): VerificationLine => {
  const v = value(env[envVar]);
  return {
    label,
    status: v ? "available" : "not configured",
    detail: v ? `${envVar}=configured` : `${envVar}=not configured`,
  };
};

const buildDeploymentStatus = (env: Partial<NodeJS.ProcessEnv>): DeploymentStatusDto => {
  const deployedSha =
    value(env.VERCEL_GIT_COMMIT_SHA) ??
    value(env.GIT_COMMIT_SHA) ??
    value(env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA);
  const expectedSha = value(env.PANDORA_EXPECTED_RELEASE_SHA);
  const verificationStatus = value(env.PANDORA_PRODUCTION_VERIFICATION_STATUS);
  const reviewer = value(env.PANDORA_PRODUCTION_VERIFICATION_REVIEWER);
  const verifiedAt = value(env.PANDORA_PRODUCTION_VERIFICATION_AT);
  const vercelUrl = value(env.VERCEL_URL);
  const shaStatus: VerificationLine = {
    label: "Deployed SHA match",
    status: !expectedSha
      ? "not configured"
      : deployedSha && deployedSha === expectedSha
        ? "available"
        : "blocked",
    detail: !expectedSha
      ? "PANDORA_EXPECTED_RELEASE_SHA is not configured; exact release matching cannot be proven."
      : deployedSha === expectedSha
        ? "Deployed commit SHA matches PANDORA_EXPECTED_RELEASE_SHA."
        : "Deployed commit SHA does not match PANDORA_EXPECTED_RELEASE_SHA.",
  };
  const missingProof = !deployedSha || !vercelUrl;
  const verifiedIncomplete =
    verificationStatus === "verified" && (!reviewer || !verifiedAt);
  const state: DeploymentVerificationState = !verificationStatus
    ? "not configured"
    : !deployedSha
      ? "pending deployment"
      : (expectedSha && deployedSha !== expectedSha) || verifiedIncomplete
        ? "blocked"
        : verificationStatus === "verified"
          ? "verified manually required"
          : missingProof
            ? "pending deployment"
            : "deployed but unverified";
  const caveats = [
    !vercelUrl
      ? "Vercel deployment URL proof is missing; a quota-limited or unrecorded deployment cannot be treated as production verification."
      : null,
    verificationStatus !== "verified"
      ? "Production closure is not complete until owner/operator verification is recorded."
      : null,
    "CI success is not the same as production verification.",
  ].filter(Boolean) as string[];
  return {
    deployedCommitSha: {
      label: "Actual deployed SHA",
      status: deployedSha ? "available" : "not configured",
      detail: deployedSha ?? "VERCEL_GIT_COMMIT_SHA/GIT_COMMIT_SHA/NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA not configured",
    },
    expectedReleaseSha: {
      label: "Expected release SHA",
      status: expectedSha ? "available" : "not configured",
      detail: expectedSha ?? "PANDORA_EXPECTED_RELEASE_SHA not configured",
    },
    deployedShaMatchesExpected: shaStatus,
    vercelEnvironment: configured("Vercel environment", "VERCEL_ENV", env),
    vercelUrl: configured("Vercel URL", "VERCEL_URL", env),
    productionVerificationStatus: {
      label: "Production verification status",
      status: verificationStatus === "verified" ? "available" : verificationStatus ? "blocked" : "not configured",
      detail: verificationStatus ?? "PANDORA_PRODUCTION_VERIFICATION_STATUS not configured",
    },
    productionVerificationReviewer: {
      label: "Production verification reviewer",
      status: reviewer ? "available" : "not configured",
      detail: reviewer ? "PANDORA_PRODUCTION_VERIFICATION_REVIEWER=configured" : "PANDORA_PRODUCTION_VERIFICATION_REVIEWER not configured",
    },
    productionVerificationAt: {
      label: "Production verification timestamp",
      status: verifiedAt ? "available" : "not configured",
      detail: verifiedAt ?? "PANDORA_PRODUCTION_VERIFICATION_AT not configured",
    },
    deploymentVerificationState: state,
    caveats,
  };
};

const enabledRiskGates = (runtime: PandoraRuntimeSafetyConfigResult) =>
  riskGates.filter((gate) => runtime.config[gate]);
const gateDetail = (
  runtime: PandoraRuntimeSafetyConfigResult,
  gate: RiskGate,
) => `${riskGateLabels[gate]}:${runtime.gates[gate]?.envVar ?? gate}`;
const runtimeGateMatrix = (
  runtime: PandoraRuntimeSafetyConfigResult,
): RuntimeGateMatrixRow[] =>
  runtimeGateKeys.map((gateKey) => {
    const gate = runtime.gates[gateKey];
    const isPersistedRead = gateKey === "persistedMemoryReadEnabled";
    const dangerous = gate?.dangerous ?? !isPersistedRead;
    return {
      gateKey,
      envVarName: gate?.envVar ?? gateKey,
      enabled: runtime.config[gateKey],
      dangerous,
      closureImpact: isPersistedRead
        ? runtime.config[gateKey]
          ? "required read-proof gate enabled"
          : "blocks closure: read proof disabled"
        : runtime.config[gateKey]
          ? `blocks closure: dangerous gate ${gateKey} enabled`
          : "closure-safe disabled state",
      expectedPhase3EState: isPersistedRead
        ? "enabled for authenticated production read proof"
        : "disabled",
    };
  });

export async function loadAdminMemoryVerification(input: {
  session: PandoraServerSessionResult;
  context?: Partial<PersistedMemoryReadContext>;
  repository?: PersistedMemoryReadRepository;
  runtime?: PandoraRuntimeSafetyConfigResult;
  env?: Partial<NodeJS.ProcessEnv>;
}): Promise<AdminMemoryVerificationDto> {
  const env = input.env ?? process.env;
  const runtime = input.runtime ?? resolvePandoraRuntimeSafetyConfig(env);
  const commit =
    value(env.VERCEL_GIT_COMMIT_SHA) ??
    value(env.GIT_COMMIT_SHA) ??
    value(env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA);
  const deploymentStatus = buildDeploymentStatus(env);
  const persistedReadGateEnabled = runtime.config.persistedMemoryReadEnabled;
  const browser = await loadPersistedMemoryBrowserView({
    authenticated: input.session.ok,
    context: input.context,
    repository: input.repository,
    runtime,
    filters: { namespace: input.context?.namespace ?? "real_life" },
  });
  const authBlocked = !input.session.ok;
  const dbBlocked = browser.blockers.find((b) => b.code !== "auth_required");
  const supabaseReadAvailability: VerificationLine = authBlocked
    ? {
        label: "Supabase read availability",
        status: "blocked",
        detail:
          "Authenticated admin/operator session is required before reading through RLS.",
      }
    : !persistedReadGateEnabled
      ? {
          label: "Supabase read availability",
          status: "disabled",
          detail:
            "PANDORA_ENABLE_PERSISTED_MEMORY_READ is disabled; verification did not override it.",
        }
      : dbBlocked
        ? {
            label: "Supabase read availability",
            status: "unavailable",
            detail: dbBlocked.message,
          }
        : {
            label: "Supabase read availability",
            status: "available",
            detail: browser.empty
              ? "Read path returned no rows for this user/namespace."
              : "Read path returned user-scoped rows.",
          };
  const enabledRisks = enabledRiskGates(runtime);
  const unsafe = enabledRisks.length > 0;
  const publicRead = runtime.config.publicMemoryReadEnabled;
  const gateMatrix = runtimeGateMatrix(runtime);
  const guardRoutes = adminMemoryRouteGuardExpectations.map((g) => g.route);
  const guardExpectationsMissing = ![
    "/admin/memory/browser",
    "/admin/memory/audit",
    "/admin/memory/verification",
  ].every((route) => guardRoutes.includes(route as never));
  const routeStatusAmbiguous =
    !(input.session.ok && persistedReadGateEnabled) || !input.session.ok;
  const sourceProofAmbiguous = ![
    "available",
    "not configured",
    "unavailable",
    "blocked",
    "disabled",
  ].includes(supabaseReadAvailability.status);
  const closeBlockers = [
    commit ? null : "commit proof missing",
    value(env.PANDORA_EXPECTED_RELEASE_SHA) && commit !== value(env.PANDORA_EXPECTED_RELEASE_SHA)
      ? "deployed SHA does not match expected release SHA"
      : null,
    value(env.PANDORA_PRODUCTION_VERIFICATION_STATUS)
      ? null
      : "production verification status missing",
    value(env.PANDORA_PRODUCTION_VERIFICATION_STATUS) && value(env.PANDORA_PRODUCTION_VERIFICATION_STATUS) !== "verified"
      ? "production verification status is not verified"
      : null,
    value(env.PANDORA_PRODUCTION_VERIFICATION_STATUS) === "verified" && !value(env.PANDORA_PRODUCTION_VERIFICATION_REVIEWER)
      ? "production verification reviewer missing"
      : null,
    value(env.PANDORA_PRODUCTION_VERIFICATION_STATUS) === "verified" && !value(env.PANDORA_PRODUCTION_VERIFICATION_AT)
      ? "production verification timestamp missing"
      : null,
    value(env.VERCEL_URL) ? null : "deployment URL proof missing",
    input.session.ok ? null : "operator session missing",
    persistedReadGateEnabled ? null : "persisted read gate disabled",
    supabaseReadAvailability.status === "available"
      ? null
      : `Supabase read proof unavailable: ${supabaseReadAvailability.status}`,
    publicRead ? "publicMemoryReadEnabled enabled" : null,
    runtime.config.publicMemoryPersistenceEnabled
      ? "publicMemoryPersistenceEnabled enabled"
      : null,
    unsafe
      ? `dangerous runtime gates enabled: ${enabledRisks.map((gate) => riskGateLabels[gate]).join(", ")}`
      : null,
    guardExpectationsMissing ? "admin route guard expectations missing" : null,
    routeStatusAmbiguous
      ? "browser/audit route status requires authenticated read proof"
      : null,
    sourceProofAmbiguous ? "source/proof/audit status ambiguous" : null,
  ].filter(Boolean) as string[];
  const closeRecommended = closeBlockers.length === 0;
  return {
    readOnly: true,
    route: "/admin/memory/verification",
    commitSha: {
      label: "Latest deployed commit SHA",
      status: commit ? "available" : "not configured",
      detail: commit ?? "VERCEL_GIT_COMMIT_SHA/GIT_COMMIT_SHA not configured",
    },
    deploymentStatus,
    vercelEnvProof: [
      deploymentStatus.vercelEnvironment,
      deploymentStatus.vercelUrl,
      configured("Skills commit proof", "PANDORA_SKILLS_COMMIT_SHA", env),
      configured("Skills proof status", "PANDORA_SKILLS_PROOF_STATUS", env),
    ],
    persistedMemoryReadGateStatus: {
      label: "Persisted memory read gate",
      status: persistedReadGateEnabled ? "available" : "disabled",
      detail: persistedReadGateEnabled
        ? "PANDORA_ENABLE_PERSISTED_MEMORY_READ=true; read proof can run through the authenticated RLS-scoped repository."
        : "PANDORA_ENABLE_PERSISTED_MEMORY_READ is disabled; verification respects this gate.",
    },
    supabaseReadAvailability,
    memoryBrowserRouteStatus: {
      label: "Memory browser route",
      status:
        input.session.ok && persistedReadGateEnabled ? "available" : "blocked",
      detail: persistedReadGateEnabled
        ? "/admin/memory/browser is authenticated, namespace-scoped, and read-only by contract."
        : "/admin/memory/browser remains gated because persisted memory reads are disabled.",
    },
    auditRouteStatus: {
      label: "Audit route",
      status: input.session.ok ? "available" : "blocked",
      detail:
        "/admin/memory/audit is authenticated, namespace-scoped, and read-only by contract.",
    },
    unsafeGateStatus: {
      label: "Unsafe mutation/integration gates",
      status: unsafe ? "blocked" : "disabled",
      detail: unsafe
        ? `Enabled gates: ${enabledRisks.map((gate) => gateDetail(runtime, gate)).join(", ")}.`
        : `Checked gates: ${riskGates.map((gate) => riskGateLabels[gate]).join(", ")}. All disabled.`,
    },
    publicReadStatus: {
      label: "Public read status",
      status: publicRead ? "blocked" : "disabled",
      detail: publicRead
        ? "PANDORA_ENABLE_PUBLIC_MEMORY_READ=true; public reads are not closure-safe."
        : "Public memory reads are disabled; /memory/browser redirects to the admin route.",
    },
    closureStatus: [
      {
        label: "Phase 3B status",
        status: "available",
        detail:
          "Merged foundation for gated browser proof; production verification remains manual unless deployment proof is supplied.",
      },
      {
        label: "Phase 3C status",
        status: "available",
        detail:
          "Merged browser closure hardening; this route does not claim production rows without read proof.",
      },
      {
        label: "Phase 3D status",
        status: "available",
        detail: "Verification route and guard contract are present.",
      },
      {
        label: "Phase 3E status",
        status: closeRecommended ? "available" : "blocked",
        detail: closeRecommended
          ? "Dashboard proof is code-ready and production-closure-ready only because owner/operator deployment verification proof is recorded."
          : "Closure hardening is present but final close is blocked.",
      },
      {
        label: "Latest deployed commit proof status",
        status: commit ? "available" : "not configured",
        detail: commit ?? "Commit proof env is missing.",
      },
      {
        label: "Read gate status",
        status: persistedReadGateEnabled ? "available" : "disabled",
        detail: persistedReadGateEnabled
          ? "Required read-proof gate is enabled."
          : "Read-proof gate is disabled.",
      },
      {
        label: "Dangerous gate status",
        status: unsafe ? "blocked" : "disabled",
        detail: unsafe
          ? `Dangerous gates enabled: ${enabledRisks.map((gate) => riskGateLabels[gate]).join(", ")}.`
          : "All dangerous gates disabled.",
      },
      {
        label: "Public route status",
        status: publicRead ? "blocked" : "disabled",
        detail: publicRead
          ? "Public memory reads enabled; not closure-safe."
          : "Public browser route redirects to admin browser by contract.",
      },
      {
        label: "Final close/no-close decision",
        status: closeRecommended ? "available" : "blocked",
        detail: closeRecommended
          ? "Close recommended only after manual production checklist is completed."
          : `No-close. Blockers: ${closeBlockers.join("; ")}.`,
      },
    ],
    runtimeGateMatrix: gateMatrix,
    recommendation: {
      label: "Final recommendation",
      status: closeRecommended ? "available" : "blocked",
      detail: closeRecommended
        ? "Close: deployed manual production verification proof is recorded and all safety checks pass."
        : `Do not close. Blockers: ${closeBlockers.join("; ")}.`,
      closeRecommended,
      blockers: closeBlockers,
    },
    checklist: [
      {
        label: "Authenticated verification",
        status: input.session.ok ? "available" : "blocked",
        detail: "Open /admin/memory/verification while logged in.",
      },
      {
        label: "Authenticated browser",
        status:
          input.session.ok && persistedReadGateEnabled
            ? "available"
            : "blocked",
        detail:
          "Open /admin/memory/browser?namespace=real_life while logged in, with the persisted read gate enabled by reviewed env.",
      },
      {
        label: "Authenticated audit",
        status: input.session.ok ? "available" : "blocked",
        detail: "Open /admin/memory/audit?namespace=real_life while logged in.",
      },
      {
        label: "Unauthenticated admin denial/login",
        status: "blocked",
        detail:
          "In a private browser, admin routes must show login/auth-required and no rows.",
      },
      {
        label: "Public redirect",
        status: "disabled",
        detail:
          "/memory/browser must redirect to /admin/memory/browser?namespace=real_life.",
      },
      {
        label: "No public persisted rows render",
        status: publicRead ? "blocked" : "disabled",
        detail: "Public route must not render persisted memory rows.",
      },
      {
        label: "No mutation controls exist",
        status: "available",
        detail:
          "No edit, delete, persist, execute, model, embedding, retrieval, GPT Actions, or MCP controls.",
      },
      {
        label: "Persisted read gate",
        status: persistedReadGateEnabled ? "available" : "disabled",
        detail: "Read proof respects PANDORA_ENABLE_PERSISTED_MEMORY_READ.",
      },
      {
        label: "Disabled unsafe gates",
        status: unsafe ? "blocked" : "disabled",
        detail: unsafe
          ? `Enabled gates: ${enabledRisks.map((gate) => riskGateLabels[gate]).join(", ")}.`
          : "All mutation/integration risk gates are disabled.",
      },
      {
        label: "Audit proof availability",
        status: input.session.ok ? "available" : "blocked",
        detail:
          "Audit route should show audit rows or an explicit unavailable state.",
      },
      {
        label: "Source/patch proof availability",
        status: supabaseReadAvailability.status,
        detail:
          "Browser should show source and patch proof fields or an explicit unavailable state.",
      },
      {
        label: "Skills commit proof availability",
        status: value(env.PANDORA_SKILLS_COMMIT_SHA)
          ? "available"
          : "not configured",
        detail:
          "PANDORA_SKILLS_COMMIT_SHA should be configured for closure proof.",
      },
    ],
    guardExpectations: adminMemoryRouteGuardExpectations,
  };
}
