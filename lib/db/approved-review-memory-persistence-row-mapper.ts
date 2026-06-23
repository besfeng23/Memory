import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { ApprovedReviewItemPlan } from "@/lib/services/approved-review-memory-persistence-preview-contract";
import type { ApprovedReviewMemoryPersistenceExecutorResult } from "@/lib/services/approved-review-memory-persistence-executor-contract";

export type ApprovedReviewPersistenceRpcPayload = {
  p_review_item_id: string;
  p_namespace: string;
  p_approved_decision_id: string;
  p_idempotency_key: string;
  p_preview_fingerprint: string;
  p_planned_operation: Record<string, unknown>;
};

function rejectClientUserId(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.prototype.hasOwnProperty.call(value, "user_id") || Object.prototype.hasOwnProperty.call(value, "userId") || Object.values(value as Record<string, unknown>).some(rejectClientUserId);
}

export function mapApprovedReviewPlanToRpcPayload(input: { context: RepositoryContext; plan: ApprovedReviewItemPlan; decisionId: string; idempotencyKey: string; previewFingerprint: string; clientPayload?: unknown }): RepositoryResult<ApprovedReviewPersistenceRpcPayload> {
  const { context, plan } = input;
  if (rejectClientUserId(input.clientPayload)) return repositoryError("validation_failed", "client user_id/userId is not accepted for memory persistence.");
  if (!context.userId) return repositoryError("auth_required", "Repository context userId is required.");
  if (!context.namespace) return repositoryError("validation_failed", "Repository context namespace is required.");
  if (!plan.source || !plan.item || !plan.patch || !plan.auditLog) return repositoryError("validation_failed", "Approved review persistence plan is incomplete.");
  if (!input.decisionId || !input.idempotencyKey || !input.previewFingerprint) return repositoryError("validation_failed", "decision id, idempotency key, and preview fingerprint are required.");
  if (plan.source.userId !== context.userId || plan.item.userId !== context.userId || plan.auditLog.actorUserId !== context.userId) return repositoryError("validation_failed", "Plan user must match repository context.");
  if (plan.source.namespace !== context.namespace || plan.item.namespace !== context.namespace || plan.patch.namespace !== context.namespace) return repositoryError("namespace_mismatch", "Plan namespace must match repository context.");
  if (!plan.source.appendOnly || !plan.item.appendOnly || !plan.patch.appendOnly || !plan.auditLog.appendOnly || plan.patch.operation !== "append") return repositoryError("validation_failed", "Only append-only approved-review persistence plans are supported.");
  return repositoryOk({
    p_review_item_id: plan.itemId,
    p_namespace: context.namespace,
    p_approved_decision_id: input.decisionId,
    p_idempotency_key: input.idempotencyKey,
    p_preview_fingerprint: input.previewFingerprint,
    p_planned_operation: { source: plan.source, item: plan.item, patch: plan.patch, auditLog: plan.auditLog, evidenceSnapshot: plan.evidenceSafety, namespaceSafety: plan.namespaceSafety, appendOnly: true },
  });
}

export function mapApprovedReviewPersistenceRpcResult(row: unknown): RepositoryResult<ApprovedReviewMemoryPersistenceExecutorResult> {
  const data = Array.isArray(row) ? row[0] : row;
  if (!data || typeof data !== "object") return repositoryError("database_error", "RPC returned an empty approved-review persistence result.");
  return repositoryOk(data as ApprovedReviewMemoryPersistenceExecutorResult);
}
