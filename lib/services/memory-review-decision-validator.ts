import type { MemoryReviewBlocker, MemoryReviewDecision, MemoryReviewerContext, MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";

export type ValidateMemoryReviewDecisionInput = { item: MemoryReviewQueueItem; reviewer: MemoryReviewerContext; decision: MemoryReviewDecision };
export type ValidateMemoryReviewDecisionResult = { ok: boolean; status: MemoryReviewQueueItem["status"]; wouldPersist: false; wouldCreatePersistenceOperation: false; blockers: MemoryReviewBlocker[]; warnings: string[]; userId: string; namespace: MemoryReviewQueueItem["namespace"] };

export function validateMemoryReviewDecision(input: ValidateMemoryReviewDecisionInput): ValidateMemoryReviewDecisionResult {
  const blockers: MemoryReviewBlocker[] = [];
  if (input.decision.clientUserId || input.decision.client_user_id) blockers.push("client_user_id_override_attempt");
  if (["approve_append", "reject", "request_clarification"].includes(input.decision.action) && input.item.status !== "pending_review") blockers.push("not_pending");
  if (input.decision.action === "approve_append") {
    if (!input.item.appendOnly || input.item.proposedOperation !== "append") blockers.push("non_append_only_operation");
    if (input.item.namespace !== input.reviewer.namespace) blockers.push("namespace_mismatch");
    if (input.decision.namespaceAfterReview && input.decision.namespaceAfterReview !== input.item.namespace) blockers.push("namespace_mismatch");
    if (!input.item.evidence.hasEvidence || input.item.evidence.spans.length === 0) blockers.push("missing_evidence");
    if (input.item.namespaceIsolation.mixedContent && input.decision.resolvedMixedContent !== true) blockers.push("mixed_content_unresolved");
    if (input.item.sensitivity.requiresSensitiveReview && input.decision.resolvedSensitive !== true) blockers.push("sensitive_unresolved");
  }
  const uniqueBlockers = Array.from(new Set(blockers));
  const status = uniqueBlockers.length > 0 ? input.item.status : input.decision.action === "approve_append" ? "approved_for_append" : input.decision.action === "reject" ? "rejected" : input.decision.action === "request_clarification" ? "needs_clarification" : input.decision.action === "mark_sensitive" ? "blocked_sensitive" : input.decision.action === "mark_namespace_mismatch" ? "blocked_namespace_mismatch" : "archived";
  return { ok: uniqueBlockers.length === 0, status, wouldPersist: false, wouldCreatePersistenceOperation: false, blockers: uniqueBlockers, warnings: [], userId: input.reviewer.userId, namespace: input.item.namespace };
}
