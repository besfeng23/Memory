import type { MemoryIngestPersistenceRepository } from "@/lib/db/memory-ingest-persistence-contract";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";

export type FakeMemoryIngestPersistenceCall = {
  method: keyof MemoryIngestPersistenceRepository;
  namespace: string;
  userId: string;
  contextUserId: string;
  metadata?: Record<string, unknown>;
};

export type FakeMemoryIngestPersistenceRepository = MemoryIngestPersistenceRepository & {
  calls: FakeMemoryIngestPersistenceCall[];
};

export function createFakeMemoryIngestPersistenceRepository(options: { failAt?: keyof MemoryIngestPersistenceRepository } = {}): FakeMemoryIngestPersistenceRepository {
  const calls: FakeMemoryIngestPersistenceCall[] = [];

  function record(method: keyof MemoryIngestPersistenceRepository, input: { namespace: string; userId: string; context: { userId: string }; metadata?: Record<string, unknown> }) {
    calls.push({ method, namespace: input.namespace, userId: input.userId, contextUserId: input.context.userId, metadata: input.metadata });
    if (options.failAt === method) return repositoryError("database_error", "Fake injected repository failure.", { method });
    return null;
  }

  return {
    calls,
    insertMemorySource: async (input) => record("insertMemorySource", input) ?? repositoryOk({ memorySourceId: "fake-memory-source-id" }),
    insertMemoryItem: async (input) => record("insertMemoryItem", input) ?? repositoryOk({ memoryItemId: "fake-memory-item-id" }),
    insertMemoryPatch: async (input) => record("insertMemoryPatch", input) ?? repositoryOk({ memoryPatchId: "fake-memory-patch-id" }),
    insertAuditLog: async (input) => record("insertAuditLog", input) ?? repositoryOk({ auditLogId: "fake-audit-log-id" }),
    finalizeIdempotencyRecord: async (input) => record("finalizeIdempotencyRecord", { ...input, metadata: {} }) ?? repositoryOk({ idempotencyRecordId: "fake-idempotency-record-id" }),
  };
}
