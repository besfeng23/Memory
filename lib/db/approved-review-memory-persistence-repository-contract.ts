import type { RepositoryContext } from "@/lib/db/repository-context";
import type { RepositoryResult } from "@/lib/db/repository-result";
import type { ApprovedReviewMemoryPersistenceExecutorResult } from "@/lib/services/approved-review-memory-persistence-executor-contract";
import type { PlannedAuditLogAppend, PlannedMemoryItemAppend, PlannedMemoryPatchAppend, PlannedMemorySourceAppend, ApprovedReviewItemPlan } from "@/lib/services/approved-review-memory-persistence-preview-contract";

export type FutureApprovedReviewPersistenceRepositoryResult = { id: string; appendOnly: true; namespace: string; userIdFromContext: true; overwroteExistingMemory: false; deletedExistingMemory: false };
export type ExecuteApprovedReviewPersistenceInput = { plan: ApprovedReviewItemPlan; decisionId: string; idempotencyKey: string; previewFingerprint: string; clientPayload?: unknown };

/** Implementations must derive userId from RepositoryContext, enforce namespace isolation, and only append; no overwrite/delete behavior is allowed. */
export interface ApprovedReviewMemoryPersistenceRepository {
  executeApprovedReviewPersistence?(context: RepositoryContext, input: ExecuteApprovedReviewPersistenceInput): Promise<RepositoryResult<ApprovedReviewMemoryPersistenceExecutorResult>>;
  appendMemorySourceFromApprovedReview(context: RepositoryContext, plan: PlannedMemorySourceAppend): Promise<RepositoryResult<FutureApprovedReviewPersistenceRepositoryResult>>;
  appendMemoryItemFromApprovedReview(context: RepositoryContext, plan: PlannedMemoryItemAppend): Promise<RepositoryResult<FutureApprovedReviewPersistenceRepositoryResult>>;
  appendMemoryPatchFromApprovedReview(context: RepositoryContext, plan: PlannedMemoryPatchAppend): Promise<RepositoryResult<FutureApprovedReviewPersistenceRepositoryResult>>;
  appendAuditLogForApprovedReviewPersistence(context: RepositoryContext, plan: PlannedAuditLogAppend): Promise<RepositoryResult<FutureApprovedReviewPersistenceRepositoryResult>>;
  markReviewItemPersistencePreviewed(context: RepositoryContext, reviewItemId: string): Promise<RepositoryResult<{ reviewItemId: string; previewedOnly: true; wouldPersist: false }>>;
}
