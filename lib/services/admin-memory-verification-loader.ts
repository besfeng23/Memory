import { resolvePandoraRuntimeSafetyConfig, type PandoraRuntimeSafetyConfigResult } from "@/lib/config/pandora-runtime-safety-config";
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
  supabaseReadAvailability: VerificationLine;
  memoryBrowserRouteStatus: VerificationLine;
  auditRouteStatus: VerificationLine;
  unsafeGateStatus: VerificationLine;
  publicReadStatus: VerificationLine;
  recommendation: VerificationLine & { closeRecommended: boolean };
  checklist: VerificationLine[];
  guardExpectations: typeof adminMemoryRouteGuardExpectations;
};

const value = (v?: string) => v && v.trim() ? v : undefined;
const configured = (label: string, envVar: string, env: Partial<NodeJS.ProcessEnv>): VerificationLine => {
  const v = value(env[envVar]);
  return { label, status: v ? "available" : "not configured", detail: v ? `${envVar}=configured` : `${envVar}=not configured` };
};
const hasUnsafeWrites = (runtime: PandoraRuntimeSafetyConfigResult) => runtime.config.ingestProductionWriteEnabled || runtime.config.approvedReviewPersistenceEnabled || runtime.config.publicMemoryPersistenceEnabled;

export async function loadAdminMemoryVerification(input: { session: PandoraServerSessionResult; context?: Partial<PersistedMemoryReadContext>; repository?: PersistedMemoryReadRepository; runtime?: PandoraRuntimeSafetyConfigResult; env?: Partial<NodeJS.ProcessEnv> }): Promise<AdminMemoryVerificationDto> {
  const env = input.env ?? process.env;
  const runtime = input.runtime ?? resolvePandoraRuntimeSafetyConfig(env);
  const commit = value(env.VERCEL_GIT_COMMIT_SHA) ?? value(env.GIT_COMMIT_SHA) ?? value(env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA);
  const browser = await loadPersistedMemoryBrowserView({ authenticated: input.session.ok, context: input.context, repository: input.repository, runtime: { ...runtime, config: { ...runtime.config, persistedMemoryReadEnabled: true } }, filters: { namespace: input.context?.namespace ?? "real_life" } });
  const authBlocked = !input.session.ok;
  const dbBlocked = browser.blockers.find((b) => b.code !== "auth_required");
  const supabaseReadAvailability: VerificationLine = authBlocked
    ? { label: "Supabase read availability", status: "blocked", detail: "Authenticated admin/operator session is required before reading through RLS." }
    : dbBlocked
      ? { label: "Supabase read availability", status: "unavailable", detail: dbBlocked.message }
      : { label: "Supabase read availability", status: "available", detail: browser.empty ? "Read path returned no rows for this user/namespace." : "Read path returned user-scoped rows." };
  const unsafe = hasUnsafeWrites(runtime);
  const publicRead = runtime.config.publicMemoryReadEnabled;
  const browserOk = input.session.ok ? "available" : "blocked";
  const auditOk = input.session.ok ? "available" : "blocked";
  const closeRecommended = Boolean(commit) && !unsafe && !publicRead && input.session.ok && supabaseReadAvailability.status !== "unavailable";
  return {
    readOnly: true,
    route: "/admin/memory/verification",
    commitSha: { label: "Latest deployed commit SHA", status: commit ? "available" : "not configured", detail: commit ?? "VERCEL_GIT_COMMIT_SHA/GIT_COMMIT_SHA not configured" },
    vercelEnvProof: [configured("Vercel environment", "VERCEL_ENV", env), configured("Vercel URL", "VERCEL_URL", env), configured("Skills commit proof", "PANDORA_SKILLS_COMMIT_SHA", env), configured("Skills proof status", "PANDORA_SKILLS_PROOF_STATUS", env)],
    supabaseReadAvailability,
    memoryBrowserRouteStatus: { label: "Memory browser route", status: browserOk, detail: "/admin/memory/browser is authenticated, namespace-scoped, and read-only by contract." },
    auditRouteStatus: { label: "Audit route", status: auditOk, detail: "/admin/memory/audit is authenticated, namespace-scoped, and read-only by contract." },
    unsafeGateStatus: { label: "Unsafe mutation gates", status: unsafe ? "blocked" : "disabled", detail: unsafe ? "One or more write/persistence gates are enabled; do not close without review." : "Production write, public persistence, model, embedding, retrieval, GPT Actions, and MCP gates are disabled by default unless explicitly configured." },
    publicReadStatus: { label: "Public read status", status: publicRead ? "blocked" : "disabled", detail: publicRead ? "PANDORA_ENABLE_PUBLIC_MEMORY_READ=true; public reads are not closure-safe." : "Public memory reads are disabled; /memory/browser redirects to the admin route." },
    recommendation: { label: "Final recommendation", status: closeRecommended ? "available" : "blocked", detail: closeRecommended ? "Close after deployed manual checklist passes." : "Do not close until blocked/not configured production proof items are resolved.", closeRecommended },
    checklist: [
      { label: "Authenticated browser", status: input.session.ok ? "available" : "blocked", detail: "Open /admin/memory/browser?namespace=real_life while logged in." },
      { label: "Unauthenticated admin denial/login", status: "blocked", detail: "In a private browser, admin routes must show login/auth-required and no rows." },
      { label: "Public redirect", status: "disabled", detail: "/memory/browser must redirect to /admin/memory/browser?namespace=real_life." },
      { label: "Read-only behavior", status: "available", detail: "No edit, delete, persist, execute, model, embedding, retrieval, GPT Actions, or MCP controls." },
      { label: "Disabled unsafe gates", status: unsafe ? "blocked" : "disabled", detail: "Inspect PANDORA_ENABLE_* unsafe gate variables." },
      { label: "Audit proof availability", status: auditOk, detail: "Audit route should show audit rows or an explicit unavailable state." },
      { label: "Source/patch proof availability", status: supabaseReadAvailability.status, detail: "Browser should show source and patch proof fields or an explicit unavailable state." },
      { label: "Skills commit proof availability", status: value(env.PANDORA_SKILLS_COMMIT_SHA) ? "available" : "not configured", detail: "PANDORA_SKILLS_COMMIT_SHA should be configured for closure proof." },
    ],
    guardExpectations: adminMemoryRouteGuardExpectations,
  };
}
