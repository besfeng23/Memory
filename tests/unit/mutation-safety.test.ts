import { describe, expect, it } from "vitest";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { createAuditLogsRepository, createIdempotencyRecordsRepository, createMemoryItemsRepository, createMemoryPatchesRepository, createMemorySourcesRepository } from "@/lib/db/core-repositories";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import type {
  AuditLogRow,
  IdempotencyRecordRow,
  MemoryItemRow,
  MemoryPatchRow,
  MemorySourceRow,
  PublicTableInsert,
} from "@/lib/supabase/database.types";
import { buildIdempotencyContext } from "@/lib/services/idempotency";
import { saveMemoryCandidateWithSafety, saveMemoryPatchWithSafety } from "@/lib/memory/services/mutation-safety";

const context: RepositoryContext = {
  userId: "user_id",
  namespace: "real_life",
  requestId: "request-id",
};

function idempotencyRecordRow(values: PublicTableInsert<"idempotency_records">): IdempotencyRecordRow {
  return {
    id: "idempotency_record_id",
    user_id: values.user_id,
    namespace: values.namespace,
    scope: values.scope,
    operation: values.operation,
    idempotency_key: values.idempotency_key,
    key_source: values.key_source,
    fingerprint: values.fingerprint,
    request_hash: values.request_hash,
    response_hash: values.response_hash,
    status: values.status,
    metadata: values.metadata,
    expires_at: values.expires_at,
    created_at: values.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: values.updated_at,
  };
}

function memoryItemRow(values: PublicTableInsert<"memory_items">): MemoryItemRow {
  return {
    id: "memory_item_id",
    user_id: values.user_id,
    namespace: values.namespace,
    memory_type: values.memory_type,
    title: values.title,
    body: values.body,
    strength: values.strength,
    confidence: values.confidence,
    canon_status: values.canon_status,
    source_summary: values.source_summary,
    metadata: values.metadata,
    is_active: values.is_active,
    created_at: values.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: values.updated_at,
  };
}

function memorySourceRow(values: PublicTableInsert<"memory_sources">): MemorySourceRow {
  return {
    id: "memory_source_id",
    user_id: values.user_id,
    namespace: values.namespace,
    memory_item_id: values.memory_item_id,
    source_type: values.source_type,
    source_ref: values.source_ref,
    excerpt: values.excerpt,
    confidence: values.confidence,
    metadata: values.metadata,
    created_at: values.created_at ?? "2026-01-01T00:00:00.000Z",
  };
}

function memoryPatchRow(values: PublicTableInsert<"memory_patches">): MemoryPatchRow {
  return {
    id: "memory_patch_id",
    user_id: values.user_id,
    namespace: values.namespace,
    memory_item_id: values.memory_item_id,
    patch_type: values.patch_type,
    reason: values.reason,
    before_snapshot: values.before_snapshot,
    after_snapshot: values.after_snapshot,
    metadata: values.metadata,
    created_at: values.created_at ?? "2026-01-01T00:00:00.000Z",
  };
}

function auditLogRow(values: PublicTableInsert<"audit_logs">): AuditLogRow {
  return {
    id: "audit_log_id",
    user_id: values.user_id,
    namespace: values.namespace,
    action: values.action,
    table_name: values.table_name,
    record_id: values.record_id,
    before_snapshot: values.before_snapshot,
    after_snapshot: values.after_snapshot,
    metadata: values.metadata,
    created_at: values.created_at ?? "2026-01-01T00:00:00.000Z",
  };
}

function createIdempotencyRepository(records: IdempotencyRecordRow[] = []) {
  const created: Array<PublicTableInsert<"idempotency_records">> = [];

  const repository = {
    async getById() {
      return repositoryError("not_found", "not used");
    },
    async list() {
      return repositoryOk(records);
    },
    async create(input) {
      const values = { ...input.values, user_id: input.context.userId } satisfies PublicTableInsert<"idempotency_records">;
      created.push(values);
      const row = idempotencyRecordRow(values);
      records.push(row);
      return repositoryOk(row);
    },
  } satisfies ReturnType<typeof createIdempotencyRecordsRepository>;

  return { repository, created };
}

describe("mutation safety orchestration", () => {
  it("wraps memory candidate saving with idempotency lookup and outcome recording", async () => {
    const idempotency = createIdempotencyRepository();
    const memoryItemsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        const values = { ...input.values, user_id: input.context.userId } satisfies PublicTableInsert<"memory_items">;
        return repositoryOk(memoryItemRow(values));
      },
    } satisfies ReturnType<typeof createMemoryItemsRepository>;
    const memorySourcesRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        const values = { ...input.values, user_id: input.context.userId } satisfies PublicTableInsert<"memory_sources">;
        return repositoryOk(memorySourceRow(values));
      },
    } satisfies ReturnType<typeof createMemorySourcesRepository>;

    const result = await saveMemoryCandidateWithSafety(
      {
        context,
        safety: {
          clientKey: "candidate-key",
          responseHash: "response-hash",
        },
        candidate: {
          namespace: "real_life",
          memory_type: "observation",
          title: "Validated memory",
          body: "This is a validated memory body.",
          strength: "medium",
          confidence: 0.8,
          canon_status: "draft",
          metadata: {},
          sources: [
            {
              source_type: "user_statement",
              confidence: 0.9,
              metadata: {},
            },
          ],
        },
      },
      {
        repository: idempotency.repository,
        memoryItemsRepository,
        memorySourcesRepository,
        now: () => "2026-01-01T00:00:00.000Z",
      },
    );

    expect(result.ok).toBe(true);
    expect(idempotency.created).toHaveLength(1);
    expect(idempotency.created[0]).toMatchObject({
      namespace: "real_life",
      scope: "memory_candidate",
      operation: "saveMemoryCandidate",
      idempotency_key: "candidate-key",
      status: "completed",
      response_hash: "response-hash",
    });
  });

  it("blocks duplicate memory patch mutations by fingerprint before writing", async () => {
    const idempotencyContextResult = buildIdempotencyContext({
      userId: context.userId,
      namespace: context.namespace,
      scope: "memory_patch",
      operation: "saveMemoryPatch",
      clientKey: "patch-key",
    });

    if (!idempotencyContextResult.ok) {
      throw new Error(idempotencyContextResult.error.message);
    }

    const existingRecord = idempotencyRecordRow({
      user_id: context.userId,
      namespace: context.namespace,
      scope: "memory_patch",
      operation: "saveMemoryPatch",
      idempotency_key: "patch-key",
      key_source: "client",
      fingerprint: idempotencyContextResult.data.fingerprint,
      request_hash: null,
      response_hash: null,
      status: "completed",
      metadata: {},
      expires_at: null,
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    const idempotency = createIdempotencyRepository([existingRecord]);
    let patchWriteCalled = false;
    const memoryPatchesRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create() {
        patchWriteCalled = true;
        return repositoryError("database_error", "should not write");
      },
    } satisfies ReturnType<typeof createMemoryPatchesRepository>;

    const result = await saveMemoryPatchWithSafety(
      {
        context,
        safety: { clientKey: "patch-key" },
        candidate: {
          namespace: "real_life",
          memory_item_id: "memory_item_id",
          patch_type: "correction",
          reason: "Correcting an existing memory item.",
          before_snapshot: null,
          after_snapshot: { body: "Updated" },
          metadata: {},
        },
      },
      {
        repository: idempotency.repository,
        memoryPatchesRepository,
      },
    );

    expect(result.ok).toBe(false);
    expect(patchWriteCalled).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("idempotency_conflict");
    }
  });

  it("requires a transaction adapter when requested", async () => {
    const idempotency = createIdempotencyRepository();
    let patchWriteCalled = false;
    const memoryPatchesRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create() {
        patchWriteCalled = true;
        return repositoryError("database_error", "should not write");
      },
    } satisfies ReturnType<typeof createMemoryPatchesRepository>;

    const result = await saveMemoryPatchWithSafety(
      {
        context,
        safety: {
          clientKey: "requires-transaction",
          requireTransaction: true,
        },
        candidate: {
          namespace: "real_life",
          memory_item_id: "memory_item_id",
          patch_type: "correction",
          reason: "Correcting an existing memory item.",
          before_snapshot: null,
          after_snapshot: { body: "Updated" },
          metadata: {},
        },
      },
      {
        repository: idempotency.repository,
        memoryPatchesRepository,
      },
    );

    expect(result.ok).toBe(false);
    expect(patchWriteCalled).toBe(false);
    expect(idempotency.created).toHaveLength(1);
    expect(idempotency.created[0].status).toBe("failed");
    if (!result.ok) {
      expect(result.error.code).toBe("database_error");
    }
  });

  it("runs through an injected transaction adapter for patch mutations", async () => {
    const idempotency = createIdempotencyRepository();
    let adapterCalled = false;
    const memoryPatchesRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        const values = { ...input.values, user_id: input.context.userId } satisfies PublicTableInsert<"memory_patches">;
        return repositoryOk(memoryPatchRow(values));
      },
    } satisfies ReturnType<typeof createMemoryPatchesRepository>;
    const auditLogsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        const values = { ...input.values, user_id: input.context.userId } satisfies PublicTableInsert<"audit_logs">;
        return repositoryOk(auditLogRow(values));
      },
    } satisfies ReturnType<typeof createAuditLogsRepository>;

    const result = await saveMemoryPatchWithSafety(
      {
        context,
        safety: {
          clientKey: "patch-with-adapter",
          requireTransaction: true,
        },
        candidate: {
          namespace: "real_life",
          memory_item_id: "memory_item_id",
          patch_type: "correction",
          reason: "Correcting an existing memory item.",
          before_snapshot: null,
          after_snapshot: { body: "Updated" },
          metadata: {},
        },
      },
      {
        repository: idempotency.repository,
        memoryPatchesRepository,
        auditLogsRepository,
        transactionAdapter: {
          async run(_context, operation) {
            adapterCalled = true;
            return operation();
          },
        },
      },
    );

    expect(result.ok).toBe(true);
    expect(adapterCalled).toBe(true);
    expect(idempotency.created[0].status).toBe("completed");
  });
});
