import { repositoryError, type RepositoryResult } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { ApprovedReviewMemoryPersistenceRepository, ExecuteApprovedReviewPersistenceInput } from "@/lib/db/approved-review-memory-persistence-repository-contract";
import { mapApprovedReviewPersistenceRpcResult, mapApprovedReviewPlanToRpcPayload } from "@/lib/db/approved-review-memory-persistence-row-mapper";
import type { ApprovedReviewMemoryPersistenceExecutorResult } from "@/lib/services/approved-review-memory-persistence-executor-contract";
import type { PlannedAuditLogAppend, PlannedMemoryItemAppend, PlannedMemoryPatchAppend, PlannedMemorySourceAppend } from "@/lib/services/approved-review-memory-persistence-preview-contract";

type SupabaseRpcOnlyClient = { rpc: (fn: "memory_execute_approved_review_persistence", args: Record<string, unknown>) => Promise<{ data: unknown; error: null | { message?: string; code?: string } }> };

export class SupabaseApprovedReviewMemoryPersistenceRepository implements ApprovedReviewMemoryPersistenceRepository {
  constructor(private readonly client: SupabaseRpcOnlyClient) {}

  async executeApprovedReviewPersistence(context: RepositoryContext, input: ExecuteApprovedReviewPersistenceInput): Promise<RepositoryResult<ApprovedReviewMemoryPersistenceExecutorResult>> {
    const payload = mapApprovedReviewPlanToRpcPayload({ context, ...input });
    if (!payload.ok) return payload;
    const { data, error } = await this.client.rpc("memory_execute_approved_review_persistence", payload.data);
    if (error) return repositoryError("database_error", `approved-review persistence RPC failed: ${error.message ?? error.code ?? "unknown"}`);
    return mapApprovedReviewPersistenceRpcResult(data);
  }

  private directWritesDisabled() { return Promise.resolve(repositoryError("validation_failed", "Approved-review memory persistence must execute through memory_execute_approved_review_persistence RPC only.")); }
  appendMemorySourceFromApprovedReview(context: RepositoryContext, plan: PlannedMemorySourceAppend) { void context; void plan; return this.directWritesDisabled(); }
  appendMemoryItemFromApprovedReview(context: RepositoryContext, plan: PlannedMemoryItemAppend) { void context; void plan; return this.directWritesDisabled(); }
  appendMemoryPatchFromApprovedReview(context: RepositoryContext, plan: PlannedMemoryPatchAppend) { void context; void plan; return this.directWritesDisabled(); }
  appendAuditLogForApprovedReviewPersistence(context: RepositoryContext, plan: PlannedAuditLogAppend) { void context; void plan; return this.directWritesDisabled(); }
  markReviewItemPersistencePreviewed(context: RepositoryContext, reviewItemId: string) { void context; void reviewItemId; return Promise.resolve(repositoryError("validation_failed", "Review item execution marking is part of memory_execute_approved_review_persistence.")); }
}
