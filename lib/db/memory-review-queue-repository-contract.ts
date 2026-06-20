import type { RepositoryContext } from "@/lib/db/repository-context";
import type { RepositoryResult } from "@/lib/db/repository-result";
import type { MemoryNamespace } from "@/lib/services/memory-extraction-contract";
import type { MemoryReviewAction, MemoryReviewQueueItem, MemoryReviewStatus } from "@/lib/services/memory-review-queue-contract";

export type ReviewQueueDecisionRecord = {
  id: string;
  itemId: string;
  userId: string;
  namespace: MemoryNamespace;
  action: MemoryReviewAction;
  reason?: string;
  createdAt: string;
  audit: Record<string, unknown>;
};

export type CreateReviewQueueItemInput = Omit<MemoryReviewQueueItem, "userId" | "namespace"> & {
  namespace?: MemoryNamespace;
  userId?: never;
};
export type ReviewQueueListFilters = { status?: MemoryReviewStatus; limit?: number; cursor?: string };
export type AppendReviewDecisionInput = { itemId: string; action: MemoryReviewAction; reason?: string; client_user_id?: string; clientUserId?: string };
export type ArchiveReviewItemInput = { itemId: string; reason?: string };
export type ReviewQueueStatusCount = { status: MemoryReviewStatus; count: number };

export interface MemoryReviewQueueRepository {
  /** Creates immutable candidate content using context.userId and context.namespace only. */
  createReviewQueueItem(context: RepositoryContext, input: CreateReviewQueueItemInput): Promise<RepositoryResult<MemoryReviewQueueItem>>;
  createManyReviewQueueItems(context: RepositoryContext, inputs: CreateReviewQueueItemInput[]): Promise<RepositoryResult<MemoryReviewQueueItem[]>>;
  listReviewQueueItems(context: RepositoryContext, filters?: ReviewQueueListFilters): Promise<RepositoryResult<MemoryReviewQueueItem[]>>;
  readReviewQueueItemById(context: RepositoryContext, id: string): Promise<RepositoryResult<MemoryReviewQueueItem>>;
  /** Decisions are append-only; approving an item never persists memory automatically. */
  appendReviewDecision(context: RepositoryContext, input: AppendReviewDecisionInput): Promise<RepositoryResult<ReviewQueueDecisionRecord>>;
  /** Archive updates status only; it never deletes the item or mutates namespace/candidate content. */
  archiveReviewItem(context: RepositoryContext, input: ArchiveReviewItemInput): Promise<RepositoryResult<MemoryReviewQueueItem>>;
  countReviewItemsByStatus(context: RepositoryContext): Promise<RepositoryResult<ReviewQueueStatusCount[]>>;
}
