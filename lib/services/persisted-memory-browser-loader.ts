import { browserSafety, toBrowserAuditView, toBrowserDetailView, toBrowserItemView, toBrowserPatchView, toBrowserSourceView, type PersistedMemoryBrowserViewModel } from "@/lib/api/persisted-memory-browser-dto";
import type { PersistedMemoryReadRepository } from "@/lib/db/persisted-memory-read-repository-contract";
import type { PersistedMemoryNamespace, PersistedMemoryReadBlocker, PersistedMemoryReadContext, PersistedMemoryReadFilter } from "@/lib/services/persisted-memory-read-contract";
import { resolvePandoraRuntimeSafetyConfig, type PandoraRuntimeSafetyConfigResult } from "@/lib/config/pandora-runtime-safety-config";

type Input = { context?: Partial<PersistedMemoryReadContext>; authenticated?: boolean; repository?: PersistedMemoryReadRepository; selectedItemId?: string; filters?: PersistedMemoryReadFilter & { namespace?: string }; runtime?: PandoraRuntimeSafetyConfigResult };
const blocker = (code: PersistedMemoryReadBlocker["code"], message: string): PersistedMemoryReadBlocker => ({ code, message });
const empty = (b: PersistedMemoryReadBlocker[], filters: Input["filters"] = {}, runtime?: PandoraRuntimeSafetyConfigResult): PersistedMemoryBrowserViewModel & { gateStatuses?: unknown } => ({ ...browserSafety, gateStatuses: runtime?.gates, namespace: filters?.namespace as PersistedMemoryNamespace | undefined, filters: filters ?? {}, items: [], detail: null, sources: [], patches: [], auditEvents: [], blockers: b, empty: true });
export async function loadPersistedMemoryBrowserView(input: Input): Promise<PersistedMemoryBrowserViewModel> {
  const runtime = input.runtime ?? resolvePandoraRuntimeSafetyConfig();
  const namespace = input.context?.namespace ?? input.filters?.namespace as PersistedMemoryNamespace | undefined;
  if (input.runtime && !runtime.config.persistedMemoryReadEnabled) return empty([blocker("read_error", "Persisted-memory read gate is disabled.")], input.filters, runtime);
  if (!input.context?.userId || input.authenticated === false) return empty([blocker("auth_required", "Authentication is required for the read-only memory browser.")], input.filters, runtime);
  if (!namespace) return empty([blocker("namespace_required", "Namespace is required for persisted-memory reads.")], input.filters, runtime);
  if (!input.repository) return empty([blocker("read_error", "Read repository is unavailable.")], { ...input.filters, namespace }, runtime);
  const context: PersistedMemoryReadContext = { userId: input.context.userId, namespace };
  const filter = { keyword: input.filters?.keyword, sourceId: input.filters?.sourceId, memoryKind: input.filters?.memoryKind, sourceType: input.filters?.sourceType, proofStatus: input.filters?.proofStatus, category: input.filters?.category, createdFrom: input.filters?.createdFrom, createdTo: input.filters?.createdTo };
  const list = await input.repository.listMemoryItems(context, { namespace, filter });
  if (!list.ok) return empty([list.blocker], { ...input.filters, namespace }, runtime);
  const selectedItemId = input.selectedItemId ?? list.items[0]?.id;
  const itemIdFilter = selectedItemId ? { itemId: selectedItemId } : undefined;
  const [sourceResult, patchResult, auditResult, detailResult] = await Promise.all([
    input.repository.listMemorySources(context, { namespace, filter: itemIdFilter }),
    input.repository.listMemoryPatches(context, { namespace, filter: itemIdFilter }),
    input.repository.listMemoryAuditEvents(context, { namespace, filter: itemIdFilter }),
    selectedItemId ? input.repository.getMemoryItemDetail(context, { namespace, id: selectedItemId }) : Promise.resolve(null),
  ]);
  const blockers = [sourceResult, patchResult, auditResult, detailResult].flatMap((r) => r && !r.ok ? [r.blocker] : []);
  const sources = sourceResult.ok ? sourceResult.items.map(toBrowserSourceView) : [];
  const patches = patchResult.ok ? patchResult.items.map(toBrowserPatchView) : [];
  const auditEvents = auditResult.ok ? auditResult.items.map(toBrowserAuditView) : [];
  const items = list.items.map((item) => toBrowserItemView(item, { patchCount: item.id === selectedItemId ? patches.length : 0, auditCount: item.id === selectedItemId ? auditEvents.length : 0 }));
  const detail = detailResult && detailResult.ok ? toBrowserDetailView(detailResult.item, sources, { patchCount: patches.length, auditCount: auditEvents.length }) : null;
  return { ...browserSafety, gateStatuses: runtime.gates, proof: { commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA, skillsCommit: process.env.PANDORA_SKILLS_COMMIT_SHA, skillsStatus: process.env.PANDORA_SKILLS_PROOF_STATUS }, namespace, selectedItemId, filters: { ...input.filters, namespace }, items, detail, sources, patches, auditEvents, blockers, empty: items.length === 0 };
}
