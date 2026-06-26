import { resolvePandoraRuntimeSafetyConfig, type PandoraRuntimeGate, type PandoraRuntimeSafetyConfigResult } from "@/lib/config/pandora-runtime-safety-config";
import { loadPersistedMemoryBrowserView } from "@/lib/services/persisted-memory-browser-loader";
import type { PersistedMemoryReadRepository } from "@/lib/db/persisted-memory-read-repository-contract";
import type { PersistedMemoryReadContext } from "@/lib/services/persisted-memory-read-contract";
import type { PandoraServerSessionResult } from "@/lib/auth/pandora-server-session-contract";
import { adminMemoryRouteGuardExpectations } from "@/lib/services/admin-memory-route-guard-contract";

export type VerificationStatus = "available" | "not configured" | "unavailable" | "blocked" | "disabled";
export type VerificationLine = { label: string; status: VerificationStatus; detail: string };
export type AdminMemoryVerificationDto = {
  readOnly: true;
  route: "/admin/memory/verification";
  commitSha: VerificationLine;
  vercelEnvProof: VerificationLine[];
  persistedMemoryReadGateStatus: VerificationLine;
  supabaseReadAvailability: VerificationLine;
  memoryBrowserRouteStatus: VerificationLine;
  auditRouteStatus: VerificationLine;
  unsafeGateStatus: VerificationLine & { enabledDangerousGates: string[] };
  publicReadStatus: VerificationLine;
  recommendation: VerificationLine & { closeRecommended: boolean };
  checklist: VerificationLine[];
  guardExpectations: typeof adminMemoryRouteGuardExpectations;
};

const dangerousGates: PandoraRuntimeGate[] = [
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

const value = (v?: string) => v && v.trim() ? v : undefined;
const configured = (label: string, envVar: string, env: Partial<NodeJS.ProcessEnv>): VerificationLine => {
  const v = value(env[envVar]);
  return { label, status: v ? "available" : "not configured", detail: v ? `${envVar}=configured` : `${envVar}=not configured` };
};
const enabledDangerousGates = (runtime: PandoraRuntimeSafetyConfigResult) => dangerousGates.filter((gate) => runtime.config[gate]).map((gate) => `${runtime.gates[gate].envVar} (${gate})`);

export async function loadAdminMemoryVerification(input: { session: PandoraServerSessionResult; context?: Partial<PersistedMemoryReadContext>; repository?: PersistedMemoryReadRepository; runtime?: PandoraRuntimeSafetyConfigResult; env?: Partial<NodeJS.ProcessEnv> }): Promise<AdminMemoryVerificationDto> {
  const env = input.env ?? process.env;
  const runtime = input.runtime ?? resolvePandoraRuntimeSafetyConfig(env);
  const commit = value(env.VERCEL_GIT_COMMIT_SHA) ?? value(env.GIT_COMMIT_SHA) ?? value(env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA);
  const persistedReadEnabled = runtime.config.persistedMemoryReadEnabled;
  const persistedMemoryReadGateStatus: VerificationLine = { label: "Persisted memory read gate", status: persistedReadEnabled ? "available" : "disabled", detail: `${runtime.gates.persistedMemoryReadEnabled.envVar}=${persistedReadEnabled ? "true" : "false"}` };
  const browser = await loadPersistedMemoryBrowserView({ authenticated: input.session.ok, context: input.context, repository: input.repository, runtime, filters: { namespace: input.context?.namespace ?? "real_life" } });
  const authBlocked = !input.session.ok;
  const dbBlocked = browser.blockers.find((b) => b.code !== "auth_required");
  const readGateBlocked = browser.blockers.find((b) => b.message.toLowerCase().includes("read gate is disabled"));
  const supabaseReadAvailability: VerificationLine = authBlocked
    ? { label: "Supabase read availability", status: "blocked", detail: "Authenticated admin/operator session is required before reading through RLS." }
    : !persistedReadEnabled || readGateBlocked
      ? { label: "Supabase read availability", status: "disabled", detail: "Persisted-memory read gate is disabled; no read proof was forced." }
      : dbBlocked
        ? { label: "Supabase read availability", status: "unavailable", detail: dbBlocked.message }
        : { label: "Supabase read availability", status: "available", detail: browser.empty ? "Read path returned no rows for this user/namespace." : "Read path returned user-scoped rows." };
  const enabledUnsafe = enabledDangerousGates(runtime);
  const unsafe = enabledUnsafe.length > 0;
  const publicRead = runtime.config.publicMemoryReadEnabled;
  const browserOk = input.session.ok && persistedReadEnabled ? "available" : "blocked";
  const auditOk = input.session.ok && persistedReadEnabled ? "available" : "blocked";
  const readProofAvailable = supabaseReadAvailability.status === "available";
  const closeRecommended = Boolean(commit) && !unsafe && input.session.ok && readProofAvailable;
  return {
    readOnly: true,
    route: "/admin/memory/verification",
    commitSha: { label: "Latest deployed commit SHA", status: commit ? "available" : "not configured", detail: commit ?? "VERCEL_GIT_COMMIT_SHA/GIT_COMMIT_SHA not configured" },
    vercelEnvProof: [configured("Vercel environment", "VERCEL_ENV", env), configured("Vercel URL", "VERCEL_URL", env), configured("Skills commit proof", "PANDORA_SKILLS_COMMIT_SHA", env), configured("Skills proof status", "PANDORA_SKILLS_PROOF_STATUS", env)],
    persistedMemoryReadGateStatus,
    supabaseReadAvailability,
    memoryBrowserRouteStatus: { label: "Memory browser route", status: browserOk, detail: persistedReadEnabled ? "/admin/memory/browser is authenticated, namespace-scoped, and read-only by contract." : "/admin/memory/browser remains gated because persisted-memory reads are disabled." },
    auditRouteStatus: { label: "Audit route", status: auditOk, detail: persistedReadEnabled ? "/admin/memory/audit is authenticated, namespace-scoped, and read-only by contract." : "/admin/memory/audit remains gated because persisted-memory reads are disabled." },
    unsafeGateStatus: { label: "Unsafe mutation/integration gates", status: unsafe ? "blocked" : "disabled", detail: unsafe ? `Enabled dangerous gates: ${enabledUnsafe.join(", ")}. Do not close without review.` : "All dangerous mutation/integration gates are disabled.", enabledDangerousGates: enabledUnsafe },
    publicReadStatus: { label: "Public read status", status: publicRead ? "blocked" : "disabled", detail: publicRead ? "PANDORA_ENABLE_PUBLIC_MEMORY_READ=true; public reads are not closure-safe." : "Public memory reads are disabled; /memory/browser redirects to the admin route." },
    recommendation: { label: "Final recommendation", status: closeRecommended ? "available" : "blocked", detail: closeRecommended ? "Close after deployed manual checklist passes." : "Do not close until commit proof, auth/session, persisted read proof, and dangerous gate blockers are resolved.", closeRecommended },
    checklist: [
      { label: "Authenticated browser", status: input.session.ok && persistedReadEnabled ? "available" : "blocked", detail: "Open /admin/memory/browser?namespace=real_life while logged in." },
      { label: "Unauthenticated admin denial/login", status: "blocked", detail: "In a private browser, admin routes must show login/auth-required and no rows." },
      { label: "Public redirect", status: "disabled", detail: "/memory/browser must redirect to /admin/memory/browser?namespace=real_life." },
      { label: "Read-only behavior", status: "available", detail: "No edit, delete, persist, execute, model, embedding, retrieval, GPT Actions, or MCP controls." },
      { label: "Persisted read gate", status: persistedMemoryReadGateStatus.status, detail: persistedMemoryReadGateStatus.detail },
      { label: "Disabled unsafe gates", status: unsafe ? "blocked" : "disabled", detail: unsafe ? `Review enabled dangerous gates: ${enabledUnsafe.join(", ")}.` : "All dangerous gates are disabled." },
      { label: "Audit proof availability", status: auditOk, detail: "Audit route should show audit rows or an explicit unavailable state." },
      { label: "Source/patch proof availability", status: supabaseReadAvailability.status, detail: "Browser should show source and patch proof fields or an explicit unavailable state." },
      { label: "Skills commit proof availability", status: value(env.PANDORA_SKILLS_COMMIT_SHA) ? "available" : "not configured", detail: "PANDORA_SKILLS_COMMIT_SHA should be configured for closure proof." },
    ],
    guardExpectations: adminMemoryRouteGuardExpectations,
  };
}
