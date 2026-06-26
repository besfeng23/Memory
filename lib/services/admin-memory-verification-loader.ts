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
type RiskGate = Exclude<PandoraRuntimeGate, "persistedMemoryReadEnabled">;
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
    vercelEnvProof: [
      configured("Vercel environment", "VERCEL_ENV", env),
      configured("Vercel URL", "VERCEL_URL", env),
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
          ? "Dashboard proof is closure-ready pending owner/operator production verification."
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
        ? "Close after deployed manual checklist passes."
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
