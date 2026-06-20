import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { CreateReviewQueueItemInput, ReviewQueueDecisionRecord } from "@/lib/db/memory-review-queue-repository-contract";
import type { MemoryReviewQueueItem, MemoryReviewStatus } from "@/lib/services/memory-review-queue-contract";
import type { MemoryNamespace } from "@/lib/services/memory-extraction-contract";

export type MemoryReviewQueueItemRow = {
  id: string; user_id: string; namespace: MemoryNamespace; status: MemoryReviewStatus; candidate_type: string; normalized_text: string;
  evidence_snapshot: unknown; sensitivity_snapshot: unknown; namespace_snapshot: unknown; source_metadata: unknown; audit_metadata: unknown;
  append_only: boolean; proposed_operation: string; requires_review: boolean; source_ref?: string | null; request_hash?: string | null; fingerprint?: string | null;
  created_at: string; updated_at: string; archived_at?: string | null;
};
export type MemoryReviewQueueDecisionRow = { id: string; review_item_id: string; user_id: string; namespace: MemoryNamespace; action: ReviewQueueDecisionRecord["action"]; reviewer_context?: unknown; decision_metadata: unknown; created_at: string };
export type MemoryReviewQueueItemDto = { id: string; status: MemoryReviewStatus; namespace: MemoryNamespace; candidatePreview: string; evidenceSummary: string; sensitivityLevel: string; productionWriteDisabled: true; approvalActionsDisabled: true };

const statuses = new Set(["pending_review", "approved_for_append", "rejected", "needs_clarification", "blocked_namespace_mismatch", "blocked_sensitive", "blocked_policy", "archived"]);
const namespaces = new Set(["real_life", "au"]);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export function validateReviewNamespace(v: unknown): v is MemoryNamespace { return typeof v === "string" && namespaces.has(v); }
export function validateReviewStatus(v: unknown): v is MemoryReviewStatus { return typeof v === "string" && statuses.has(v); }
function validateEvidence(v: unknown): boolean { return isObj(v) && Array.isArray(v.spans) && Array.isArray(v.spanRanges) && typeof v.hasEvidence === "boolean"; }

export function reviewItemToInsertRow(context: RepositoryContext, input: CreateReviewQueueItemInput): RepositoryResult<Omit<MemoryReviewQueueItemRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string }> {
  if (input.namespace && input.namespace !== context.namespace) return repositoryError("namespace_mismatch", "Review item namespace must match repository context.");
  if (!validateReviewStatus(input.status) || input.appendOnly !== true || !validateEvidence(input.evidence)) return repositoryError("validation_failed", "Review item is malformed.");
  return repositoryOk({ id: input.id, user_id: context.userId, namespace: context.namespace, status: input.status, candidate_type: input.candidateType, normalized_text: input.normalizedText, evidence_snapshot: input.evidence, sensitivity_snapshot: input.sensitivity, namespace_snapshot: input.namespaceIsolation, source_metadata: input.sourceMetadata, audit_metadata: input.audit, append_only: true, proposed_operation: input.proposedOperation, requires_review: input.requiresReview, source_ref: input.sourceRef, request_hash: input.audit.requestHash ?? null, fingerprint: input.audit.fingerprint ?? null, created_at: input.createdAt, updated_at: input.updatedAt });
}

export function rowToReviewItem(context: RepositoryContext, row: MemoryReviewQueueItemRow): RepositoryResult<MemoryReviewQueueItem> {
  if (row.user_id !== context.userId) return repositoryError("not_found", "Review queue item user mismatch.");
  if (row.namespace !== context.namespace) return repositoryError("namespace_mismatch", "Review queue item namespace mismatch.");
  if (!validateReviewNamespace(row.namespace) || !validateReviewStatus(row.status) || row.append_only !== true || !validateEvidence(row.evidence_snapshot) || !isObj(row.sensitivity_snapshot) || !isObj(row.namespace_snapshot) || !isObj(row.source_metadata) || !isObj(row.audit_metadata)) return repositoryError("validation_failed", "Review queue row is malformed.");
  return repositoryOk({ id: row.id, userId: row.user_id, namespace: row.namespace, status: row.status, extractedCandidateId: String(row.source_ref ?? row.id), candidateType: row.candidate_type as MemoryReviewQueueItem["candidateType"], normalizedText: row.normalized_text, evidence: row.evidence_snapshot as MemoryReviewQueueItem["evidence"], sensitivity: row.sensitivity_snapshot as MemoryReviewQueueItem["sensitivity"], requiresReview: row.requires_review, appendOnly: row.append_only, proposedOperation: row.proposed_operation as MemoryReviewQueueItem["proposedOperation"], sourceMetadata: row.source_metadata as MemoryReviewQueueItem["sourceMetadata"], sourceRef: row.source_ref, namespaceIsolation: row.namespace_snapshot as MemoryReviewQueueItem["namespaceIsolation"], blockers: [], warnings: [], createdAt: row.created_at, updatedAt: row.updated_at, audit: row.audit_metadata as MemoryReviewQueueItem["audit"] });
}

export function rowToReviewItemDto(context: RepositoryContext, row: MemoryReviewQueueItemRow): RepositoryResult<MemoryReviewQueueItemDto> {
  const item = rowToReviewItem(context, row); if (!item.ok) return item;
  return repositoryOk({ id: item.data.id, status: item.data.status, namespace: item.data.namespace, candidatePreview: item.data.normalizedText.slice(0, 160), evidenceSummary: item.data.evidence.hasEvidence ? `${item.data.evidence.spans.length} evidence span(s)` : "No evidence", sensitivityLevel: item.data.sensitivity.level, productionWriteDisabled: true, approvalActionsDisabled: true });
}

export function decisionRowToDomain(context: RepositoryContext, row: MemoryReviewQueueDecisionRow): RepositoryResult<ReviewQueueDecisionRecord> {
  if (row.user_id !== context.userId || row.namespace !== context.namespace) return repositoryError("not_found", "Decision row outside repository context.");
  return repositoryOk({ id: row.id, itemId: row.review_item_id, userId: row.user_id, namespace: row.namespace, action: row.action, createdAt: row.created_at, audit: isObj(row.decision_metadata) ? row.decision_metadata : {} });
}
