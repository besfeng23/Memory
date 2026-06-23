import type { MemoryReviewQueueRepository, ReviewQueueDecisionRecord } from "@/lib/db/memory-review-queue-repository-contract";
import type { PersistedMemoryReadRepository } from "@/lib/db/persisted-memory-read-repository-contract";
import type { ApprovedReviewMemoryPersistenceExecutorResult } from "@/lib/services/approved-review-memory-persistence-executor-contract";
import type { ApprovedReviewPersistencePreviewResult } from "@/lib/services/approved-review-memory-persistence-preview-contract";
import { liveOneReviewedItemWorkflowSafetySummary, liveOneReviewedItemWorkflowStepNames, type LiveOneReviewedItemWorkflowInput, type LiveOneReviewedItemWorkflowResult } from "@/lib/services/live-one-reviewed-item-workflow-contract";
import { validateLiveOneReviewedItemWorkflowPreflight } from "@/lib/services/live-one-reviewed-item-workflow-preflight";
import { buildLiveOneReviewedItemWorkflowReceipt } from "@/lib/services/live-one-reviewed-item-workflow-receipt";

export type LiveOneReviewedItemWorkflowRunnerInput = LiveOneReviewedItemWorkflowInput & { reviewRepository: MemoryReviewQueueRepository & { readReviewDecisionById?: (context: NonNullable<LiveOneReviewedItemWorkflowInput["context"]>, id: string) => Promise<{ ok: true; data: ReviewQueueDecisionRecord } | { ok: false; error?: unknown }> }; previewService: (input: Record<string, unknown>) => ApprovedReviewPersistencePreviewResult; approvedReviewPersistenceExecutor: (input: Record<string, unknown>) => Promise<ApprovedReviewMemoryPersistenceExecutorResult>; persistedMemoryReadRepository: PersistedMemoryReadRepository; browserLoader: (input: Record<string, unknown>) => Promise<{ items: { id: string }[] }>; auditVerifier: (input: Record<string, unknown>) => Promise<{ ok: boolean; count?: number }> };
const blocked = (r: LiveOneReviewedItemWorkflowResult): LiveOneReviewedItemWorkflowResult => ({ ...r, ok: false, executed: false, steps: liveOneReviewedItemWorkflowStepNames.map((name) => ({ name, status: r.blockers.some((b) => b.step === name) ? "blocked" : "pending", message: r.blockers.find((b) => b.step === name)?.message })) });
export async function runLiveOneReviewedItemWorkflow(input: LiveOneReviewedItemWorkflowRunnerInput): Promise<LiveOneReviewedItemWorkflowResult> {
  if (!input.context?.userId || !input.namespace) return blocked(validateLiveOneReviewedItemWorkflowPreflight(input));
  const itemResult = input.reviewItemId ? await input.reviewRepository.readReviewQueueItemById(input.context, input.reviewItemId) : { ok: false } as const;
  const item = itemResult.ok ? itemResult.data : null;
  let decision: ReviewQueueDecisionRecord | null = null;
  if (input.decisionId && input.reviewRepository.readReviewDecisionById) { const result = await input.reviewRepository.readReviewDecisionById(input.context, input.decisionId); if (result.ok) decision = result.data; }
  const preview = item ? input.previewService({ context: input.context, items: [item], targetNamespace: input.namespace }) : undefined;
  const preflight = validateLiveOneReviewedItemWorkflowPreflight({ ...input, reviewItem: item, decision, preview, approvedReviewPersistenceExecutor: input.approvedReviewPersistenceExecutor, persistedMemoryReadRepository: input.persistedMemoryReadRepository, browserLoader: input.browserLoader, auditVerifier: input.auditVerifier });
  if (!preflight.ok || !item || !decision || !preview) return blocked(preflight);
  const plan = preview.plans.find((p) => p.itemId === item.id);
  const exec = await input.approvedReviewPersistenceExecutor({ context: input.context, item, preview, plan, decision, idempotencyKey: input.idempotencyKey });
  if (!exec.executed || !exec.item?.id) return blocked({ ...preflight, blockers: [{ code: "persistence_not_executed", step: "persistence_executed", message: "Injected executor did not append the reviewed memory item." }] });
  const readCtx = { userId: input.context.userId, namespace: input.namespace };
  const detail = await input.persistedMemoryReadRepository.getMemoryItemDetail(readCtx, { namespace: input.namespace, id: exec.item.id });
  if (!detail.ok) return blocked({ ...preflight, blockers: [{ code: "readback_failed", step: "readback_verified", message: "Readback verification failed." }] });
  const browser = await input.browserLoader({ context: readCtx, repository: input.persistedMemoryReadRepository, selectedItemId: exec.item.id, filters: { namespace: input.namespace } });
  if (!browser.items.some((i) => i.id === exec.item!.id)) return blocked({ ...preflight, blockers: [{ code: "browser_visibility_failed", step: "browser_visibility_verified", message: "Browser visibility verification failed." }] });
  const audit = await input.auditVerifier({ context: readCtx, memoryItemId: exec.item.id, reviewItemId: item.id, decisionId: decision.id });
  if (!audit.ok) return blocked({ ...preflight, blockers: [{ code: "audit_verification_failed", step: "audit_verified", message: "Audit verification failed." }] });
  const receipt = buildLiveOneReviewedItemWorkflowReceipt({ namespace: input.namespace, serverUserId: input.context.userId, reviewItemId: item.id, decisionId: decision.id, memoryItemId: exec.item.id, sourceId: exec.source?.id, patchCount: exec.patch ? 1 : 0, auditEventCount: audit.count ?? (exec.auditLog ? 1 : 0), idempotencyKey: input.idempotencyKey!, previewFingerprint: exec.fingerprint ?? item.audit.fingerprint ?? item.updatedAt, readbackStatus: "verified", browserVisibilityStatus: "verified", auditVerificationStatus: "verified" });
  return { ok: true, executed: true, safety: liveOneReviewedItemWorkflowSafetySummary, steps: liveOneReviewedItemWorkflowStepNames.map((name) => ({ name, status: "passed" })), blockers: [], warnings: [], receipt, previewFingerprint: receipt.previewFingerprint };
}
