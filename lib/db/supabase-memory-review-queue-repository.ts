import { repositoryError, type RepositoryResult } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";
import type { AppendReviewDecisionInput, ArchiveReviewItemInput, CreateReviewQueueItemInput, MemoryReviewQueueRepository, ReviewQueueDecisionRecord, ReviewQueueListFilters, ReviewQueueStatusCount } from "@/lib/db/memory-review-queue-repository-contract";

export const memoryReviewQueueTableNames = {
  items: "memory_review_queue_items",
  decisions: "memory_review_queue_decisions",
} as const;

export const memoryReviewQueueColumns = {
  userId: "user_id",
  namespace: "namespace",
  status: "status",
  evidenceSnapshot: "evidence_snapshot",
  sensitivitySnapshot: "sensitivity_snapshot",
  sourceMetadata: "source_metadata",
  auditMetadata: "audit_metadata",
} as const;

export type SupabaseLikeReviewQueueClient = { from: (table: string) => unknown };

export class SupabaseMemoryReviewQueueRepository implements MemoryReviewQueueRepository {
  constructor(private readonly client: SupabaseLikeReviewQueueClient) {}

  private notImplemented<T>(context: RepositoryContext): RepositoryResult<T> {
    void this.client;
    return repositoryError("database_error", "Review queue Supabase repository is a safe skeleton until RLS-safe implementation is wired.", { status: "not_implemented", userIdSource: "server_repository_context", namespace: context.namespace, tables: memoryReviewQueueTableNames });
  }

  // TODO: implement with authenticated user-scoped RLS client only; never service-role shortcuts.
  async createReviewQueueItem(context: RepositoryContext, input: CreateReviewQueueItemInput) { void input; return this.notImplemented<MemoryReviewQueueItem>(context); }
  async createManyReviewQueueItems(context: RepositoryContext, inputs: CreateReviewQueueItemInput[]) { void inputs; return this.notImplemented<MemoryReviewQueueItem[]>(context); }
  async listReviewQueueItems(context: RepositoryContext, filters?: ReviewQueueListFilters) { void filters; return this.notImplemented<MemoryReviewQueueItem[]>(context); }
  async readReviewQueueItemById(context: RepositoryContext, id: string) { void id; return this.notImplemented<MemoryReviewQueueItem>(context); }
  async appendReviewDecision(context: RepositoryContext, input: AppendReviewDecisionInput) { void input; return this.notImplemented<ReviewQueueDecisionRecord>(context); }
  async archiveReviewItem(context: RepositoryContext, input: ArchiveReviewItemInput) { void input; return this.notImplemented<MemoryReviewQueueItem>(context); }
  async countReviewItemsByStatus(context: RepositoryContext) { return this.notImplemented<ReviewQueueStatusCount[]>(context); }
}
