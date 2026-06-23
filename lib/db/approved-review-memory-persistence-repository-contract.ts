import type { RepositoryContext } from "@/lib/db/repository-context";
import type { RepositoryResult } from "@/lib/db/repository-result";
import type { PlannedAuditLogAppend, PlannedMemoryItemAppend, PlannedMemoryPatchAppend, PlannedMemorySourceAppend } from "@/lib/services/approved-review-memory-persistence-preview-contract";

export type FutureApprovedReviewPersistenceRepositoryResult = { id: string; appendOnly: true; namespace: string; userIdFromContext: true; overwroteExistingMemory: false; deletedExistingMemory: false };

/** Future-only contract. Implementations must derive userId from RepositoryContext, enforce namespace isolation, and only append; no overwrite/delete behavior is allowed. */
export interface ApprovedReviewMemoryPersistenceRepository {
  appendMemorySourceFromApprovedReview(context: RepositoryContext, plan: PlannedMemorySourceAppend): Promise<RepositoryResult<FutureApprovedReviewPersistenceRepositoryResult>>;
  appendMemoryItemFromApprovedReview(context: RepositoryContext, plan: PlannedMemoryItemAppend): Promise<RepositoryResult<FutureApprovedReviewPersistenceRepositoryResult>>;
  appendMemoryPatchFromApprovedReview(context: RepositoryContext, plan: PlannedMemoryPatchAppend): Promise<RepositoryResult<FutureApprovedReviewPersistenceRepositoryResult>>;
  appendAuditLogForApprovedReviewPersistence(context: RepositoryContext, plan: PlannedAuditLogAppend): Promise<RepositoryResult<FutureApprovedReviewPersistenceRepositoryResult>>;
  markReviewItemPersistencePreviewed(context: RepositoryContext, reviewItemId: string): Promise<RepositoryResult<{ reviewItemId: string; previewedOnly: true; wouldPersist: false }>>;
}
