import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryReviewQueueItem, MemoryReviewStatus } from "@/lib/services/memory-review-queue-contract";
import { resolveMemoryReviewStatusTransition } from "@/lib/services/memory-review-status-transition";
import type { AppendReviewDecisionInput, ArchiveReviewItemInput, CreateReviewQueueItemInput, MemoryReviewQueueRepository, ReviewQueueDecisionRecord, ReviewQueueListFilters, ReviewQueueStatusCount } from "@/lib/db/memory-review-queue-repository-contract";

function cloneItem(item: MemoryReviewQueueItem): MemoryReviewQueueItem {
  return structuredClone(item) as MemoryReviewQueueItem;
}

export class InMemoryMemoryReviewQueueRepository implements MemoryReviewQueueRepository {
  private readonly items = new Map<string, MemoryReviewQueueItem>();
  private readonly decisions: ReviewQueueDecisionRecord[] = [];

  async createReviewQueueItem(context: RepositoryContext, input: CreateReviewQueueItemInput): Promise<RepositoryResult<MemoryReviewQueueItem>> {
    if (input.namespace !== undefined && input.namespace !== context.namespace) return repositoryError("namespace_mismatch", "Review item namespace must match repository context.");
    if (this.items.has(input.id)) return repositoryError("idempotency_conflict", "Review item already exists; candidate content cannot be silently overwritten.");
    const now = new Date().toISOString();
    const item: MemoryReviewQueueItem = cloneItem({ ...input, namespace: context.namespace, userId: context.userId, createdAt: input.createdAt || now, updatedAt: input.updatedAt || now });
    this.items.set(item.id, item);
    return repositoryOk(cloneItem(item));
  }

  async createManyReviewQueueItems(context: RepositoryContext, inputs: CreateReviewQueueItemInput[]): Promise<RepositoryResult<MemoryReviewQueueItem[]>> {
    const created: MemoryReviewQueueItem[] = [];
    for (const input of inputs) {
      const result = await this.createReviewQueueItem(context, input);
      if (!result.ok) return result;
      created.push(result.data);
    }
    return repositoryOk(created);
  }

  async listReviewQueueItems(context: RepositoryContext, filters: ReviewQueueListFilters = {}): Promise<RepositoryResult<MemoryReviewQueueItem[]>> {
    const rows = [...this.items.values()].filter((item) => item.userId === context.userId && item.namespace === context.namespace && (!filters.status || item.status === filters.status));
    return repositoryOk(rows.slice(0, filters.limit ?? rows.length).map(cloneItem));
  }

  async readReviewQueueItemById(context: RepositoryContext, id: string): Promise<RepositoryResult<MemoryReviewQueueItem>> {
    const item = this.items.get(id);
    if (!item || item.userId !== context.userId || item.namespace !== context.namespace) return repositoryError("not_found", "Review queue item was not found in this user namespace.");
    return repositoryOk(cloneItem(item));
  }

  async appendReviewDecision(context: RepositoryContext, input: AppendReviewDecisionInput): Promise<RepositoryResult<ReviewQueueDecisionRecord>> {
    if (input.client_user_id || input.clientUserId) return repositoryError("validation_failed", "Client-supplied user_id is ignored and rejected for review decisions.");
    const found = await this.readReviewQueueItemById(context, input.itemId);
    if (!found.ok) return found;
    const transition = resolveMemoryReviewStatusTransition({ currentStatus: found.data.status, action: input.action });
    if (!transition.ok) return repositoryError("validation_failed", "Invalid review status transition.", { blockers: transition.blockers, from: transition.from, to: transition.to });
    const now = new Date().toISOString();
    const decision: ReviewQueueDecisionRecord = { id: `decision-${this.decisions.length + 1}`, itemId: input.itemId, userId: context.userId, namespace: context.namespace, action: input.action, reason: input.reason, createdAt: now, audit: { requestId: context.requestId, appendOnly: true, wouldPersist: false } };
    this.decisions.push(structuredClone(decision));
    const updated: MemoryReviewQueueItem = { ...found.data, status: transition.to, updatedAt: now, audit: { ...found.data.audit, updatedByUserId: context.userId, decisionTrail: [...found.data.audit.decisionTrail, { action: input.action, at: now, reviewerUserId: context.userId, reason: input.reason }] } };
    this.items.set(updated.id, cloneItem(updated));
    return repositoryOk(structuredClone(decision));
  }

  async archiveReviewItem(context: RepositoryContext, input: ArchiveReviewItemInput): Promise<RepositoryResult<MemoryReviewQueueItem>> {
    const found = await this.readReviewQueueItemById(context, input.itemId);
    if (!found.ok) return found;
    const appended = await this.appendReviewDecision(context, { itemId: input.itemId, action: "archive", reason: input.reason });
    if (!appended.ok) return appended;
    const updated = this.items.get(input.itemId);
    if (!updated) return repositoryError("not_found", "Review queue item was not found in this user namespace.");
    return repositoryOk(cloneItem(updated));
  }

  async countReviewItemsByStatus(context: RepositoryContext): Promise<RepositoryResult<ReviewQueueStatusCount[]>> {
    const counts = new Map<MemoryReviewStatus, number>();
    for (const item of this.items.values()) if (item.userId === context.userId && item.namespace === context.namespace) counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
    return repositoryOk([...counts].map(([status, count]) => ({ status, count })));
  }

  getDecisionHistoryForTest(): ReviewQueueDecisionRecord[] { return structuredClone(this.decisions); }
}
