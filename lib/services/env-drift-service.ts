import { buildEnvCatalog, generateManagedSecret, PHASE5C_SAFE_PRODUCTION, PANDORA_VERCEL_PROJECT } from "@/lib/services/env-broker-service";
import { fingerprintEnvValue } from "@/lib/services/env-fingerprint-service";
import { listVercelEnvStatus, pushVercelEnv, type VercelEnvStatusItem } from "@/lib/services/vercel-env-provider";

const DANGEROUS_GATES = new Set(["PANDORA_ENABLE_MODEL_CALLS", "PANDORA_ENABLE_EMBEDDINGS", "PANDORA_ENABLE_SEMANTIC_RETRIEVAL", "PANDORA_ENABLE_PUBLIC_MEMORY_READ", "PANDORA_ENABLE_PUBLIC_MEMORY_PERSISTENCE", "PANDORA_ENABLE_AUTO_CAPTURE"]);
const GENERATED_KEYS = new Set(["PANDORA_INTERNAL_JOB_TOKEN"]);

export type EnvDriftSeverity = "green" | "yellow" | "red";
export type EnvDriftReport = { ok: true; severity: EnvDriftSeverity; summary: Record<string, number | boolean>; missingInProvider: string[]; presentInProvider: string[]; unmanagedProviderEnvs: string[]; knownButUnclassified: string[]; unsafePublicSecretNaming: string[]; staleFingerprints: string[]; needsRedeploy: string[]; providerTokenConfigured: boolean; brokerEnabled: boolean; generatedSecretsMissing: string[]; providerError?: string };

type ProviderList = { ok: true; envs: VercelEnvStatusItem[] } | { ok: false; code: string };
export function normalizeVercelEnvList(raw: unknown): VercelEnvStatusItem[] {
  const envs = Array.isArray((raw as { envs?: unknown })?.envs) ? (raw as { envs: unknown[] }).envs : Array.isArray(raw) ? raw as unknown[] : [];
  return envs.map((item) => ({ key: typeof (item as { key?: unknown }).key === "string" ? (item as { key: string }).key : "", target: Array.isArray((item as { target?: unknown }).target) ? (item as { target: string[] }).target : [], updatedAt: typeof (item as { updatedAt?: unknown }).updatedAt === "number" ? (item as { updatedAt: number }).updatedAt : undefined, createdAt: typeof (item as { createdAt?: unknown }).createdAt === "number" ? (item as { createdAt: number }).createdAt : undefined, id: typeof (item as { id?: unknown }).id === "string" ? (item as { id: string }).id : undefined })).filter((item) => item.key);
}

export async function buildEnvDriftReport(providerList?: ProviderList): Promise<EnvDriftReport> {
  const catalog = buildEnvCatalog();
  const managed = new Set(catalog.filter((i) => i.managed).map((i) => i.key));
  const required = catalog.filter((i) => i.requiredSuggestion && i.providerTargetSuggestion === "vercel");
  const provider = providerList ?? await listVercelEnvStatus(PANDORA_VERCEL_PROJECT.providerProjectId, PANDORA_VERCEL_PROJECT.providerTeamId);
  const providerEnvs = provider.ok ? provider.envs : [];
  const providerKeys = new Set(providerEnvs.map((e) => e.key));
  const missingInProvider = required.filter((i) => !providerKeys.has(i.key)).map((i) => i.key);
  const presentInProvider = catalog.filter((i) => providerKeys.has(i.key)).map((i) => i.key);
  const unmanagedProviderEnvs = [...providerKeys].filter((key) => !managed.has(key));
  const knownButUnclassified = catalog.filter((i) => i.classificationSuggestion === "unknown").map((i) => i.key);
  const unsafePublicSecretNaming = [...new Set([...catalog.map((i) => i.key), ...providerKeys])].filter((key) => key.startsWith("NEXT_PUBLIC_") && /(SECRET|TOKEN|PASSWORD|SERVICE_ROLE|DATABASE_URL|DIRECT_URL|PRIVATE|API_KEY)/.test(key));
  const generatedSecretsMissing = [...GENERATED_KEYS].filter((key) => !providerKeys.has(key));
  const staleFingerprints = catalog.filter((i) => providerKeys.has(i.key) && process.env[i.key] && !providerEnvs.find((e) => e.key === i.key)?.updatedAt).map((i) => i.key);
  const needsRedeploy = providerEnvs.filter((e) => e.updatedAt && e.updatedAt > Number(process.env.VERCEL_GIT_COMMIT_TIMESTAMP ?? 0) * 1000).map((e) => e.key);
  const severity: EnvDriftSeverity = missingInProvider.length || unsafePublicSecretNaming.length ? "red" : unmanagedProviderEnvs.length || knownButUnclassified.length || (provider.ok === false) ? "yellow" : "green";
  return { ok: true, severity, summary: { missingInProvider: missingInProvider.length, presentInProvider: presentInProvider.length, unmanagedProviderEnvs: unmanagedProviderEnvs.length, knownButUnclassified: knownButUnclassified.length, unsafePublicSecretNaming: unsafePublicSecretNaming.length, staleFingerprints: staleFingerprints.length, needsRedeploy: needsRedeploy.length, generatedSecretsMissing: generatedSecretsMissing.length }, missingInProvider, presentInProvider, unmanagedProviderEnvs, knownButUnclassified, unsafePublicSecretNaming, staleFingerprints, needsRedeploy, providerTokenConfigured: Boolean(process.env.PANDORA_VERCEL_API_TOKEN), brokerEnabled: process.env.PANDORA_ENV_BROKER_ENABLED === "true", generatedSecretsMissing, providerError: provider.ok ? undefined : provider.code };
}

export async function pushRequiredSafeDefaults() {
  const values = Object.entries(PHASE5C_SAFE_PRODUCTION).filter(([key, value]) => !DANGEROUS_GATES.has(key) || value === "false");
  return Promise.all(values.map(([key, value]) => pushVercelEnv({ projectId: PANDORA_VERCEL_PROJECT.providerProjectId, teamId: PANDORA_VERCEL_PROJECT.providerTeamId, key, value, type: "plain", comment: "Managed by Pandora Env Broker: ENV-2 safe default" })));
}

export async function generateMissingGeneratedSecrets(report: EnvDriftReport) {
  return Promise.all(report.generatedSecretsMissing.map((key) => { const secret = generateManagedSecret(key); void fingerprintEnvValue(secret.value); return pushVercelEnv({ projectId: PANDORA_VERCEL_PROJECT.providerProjectId, teamId: PANDORA_VERCEL_PROJECT.providerTeamId, key, value: secret.value, type: "encrypted", comment: "Managed by Pandora Env Broker: generated missing secret" }); }));
}
export { DANGEROUS_GATES };
