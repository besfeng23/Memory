import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryIngestPlannedOperation } from "@/lib/services/memory-ingest-write-plan-builder";
import type { MemoryReviewBlocker, MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";

export type PreviewApprovedReviewItemsAsWritePlanInput = { context: RepositoryContext; items: MemoryReviewQueueItem[]; requestHash?: string | null; fingerprint?: string | null };
export type PreviewApprovedReviewItemsAsWritePlanResult = { status: "planned" | "blocked"; candidates: FutureMemoryIngestRequest[]; plannedOperations: MemoryIngestPlannedOperation[]; wouldPersist: false; wouldCallModel: false; wouldPerformRetrieval: false; appendOnly: true; blockers: MemoryReviewBlocker[]; warnings: string[]; requestHash: string | null; fingerprint: string | null };

const operations: MemoryIngestPlannedOperation[] = [
  { operation: "validate_namespace_boundary", target: "namespace_policy", mode: "planned_only", appendOnly: true, writesNow: false },
  { operation: "insert_memory_source", target: "memory_sources", mode: "planned_only", appendOnly: true, writesNow: false },
  { operation: "insert_memory_item", target: "memory_items", mode: "planned_only", appendOnly: true, writesNow: false },
  { operation: "insert_memory_patch", target: "memory_patches", mode: "planned_only", appendOnly: true, writesNow: false },
  { operation: "insert_audit_log", target: "audit_logs", mode: "planned_only", appendOnly: true, writesNow: false },
  { operation: "finalize_idempotency_record", target: "idempotency_records", mode: "planned_only", appendOnly: true, writesNow: false },
];

export function previewApprovedReviewItemsAsWritePlan(input: PreviewApprovedReviewItemsAsWritePlanInput): PreviewApprovedReviewItemsAsWritePlanResult {
  const blockers: MemoryReviewBlocker[] = [];
  for (const item of input.items) {
    if (item.status !== "approved_for_append") blockers.push("not_pending");
    if (!item.evidence.hasEvidence) blockers.push("missing_evidence");
    if (item.namespace !== input.context.namespace) blockers.push("namespace_mismatch");
    if (!item.appendOnly || item.proposedOperation !== "append") blockers.push("non_append_only_operation");
    if (item.sensitivity.requiresSensitiveReview && !item.sensitivity.resolved) blockers.push("sensitive_unresolved");
    if (item.namespaceIsolation.mixedContent) blockers.push("mixed_content_unresolved");
  }
  const uniqueBlockers = Array.from(new Set(blockers));
  return {
    status: uniqueBlockers.length === 0 ? "planned" : "blocked",
    candidates: uniqueBlockers.length === 0 ? input.items.map((item) => ({ namespace: item.namespace, input: item.normalizedText, source_ref: item.sourceRef ?? null, idempotency_key: null, metadata: { review: { itemId: item.id, extractedCandidateId: item.extractedCandidateId, evidence: item.evidence.spans, sensitivity: item.sensitivity.level, appendOnly: true, proposedOperation: "append" } } })) : [],
    plannedOperations: operations.map((operation) => ({ ...operation })),
    wouldPersist: false,
    wouldCallModel: false,
    wouldPerformRetrieval: false,
    appendOnly: true,
    blockers: uniqueBlockers,
    warnings: ["no_persistence", "preview_only"],
    requestHash: input.requestHash ?? null,
    fingerprint: input.fingerprint ?? null,
  };
}
