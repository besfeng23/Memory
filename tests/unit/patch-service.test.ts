import { describe, expect, it } from "vitest";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import { createAuditLogsRepository, createMemoryPatchesRepository } from "@/lib/db/core-repositories";
import type { AuditLogRow, MemoryPatchRow, PublicTableInsert } from "@/lib/supabase/database.types";
import { prepareMemoryPatch, saveMemoryPatch } from "@/lib/memory/services/patch-service";

const context: RepositoryContext = {
  userId: "user_id",
  namespace: "real_life",
};

const validPatchCandidate = {
  namespace: "real_life",
  memory_item_id: "memory_item_id",
  patch_type: "confidence_change",
  reason: "New source changed confidence level.",
  before_snapshot: { confidence: 0.5 },
  after_snapshot: { confidence: 0.8 },
  metadata: { source: "test" },
} as const;

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

describe("patch service", () => {
  it("prepares a validated memory patch without owner input", () => {
    const result = prepareMemoryPatch({
      context,
      candidate: validPatchCandidate,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.patch).toMatchObject({
        namespace: "real_life",
        memory_item_id: "memory_item_id",
        patch_type: "confidence_change",
        reason: "New source changed confidence level.",
        before_snapshot: { confidence: 0.5 },
        after_snapshot: { confidence: 0.8 },
      });
      expect(result.data.patch).not.toHaveProperty("user_id");
    }
  });

  it("rejects invalid patch candidates before repository calls", async () => {
    let patchCreateCalled = false;
    const memoryPatchesRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create() {
        patchCreateCalled = true;
        return repositoryError("database_error", "should not be called");
      },
    } satisfies ReturnType<typeof createMemoryPatchesRepository>;

    const result = await saveMemoryPatch(
      {
        context,
        candidate: {
          namespace: "real_life",
          memory_item_id: "memory_item_id",
          patch_type: "confidence_change",
          after_snapshot: { confidence: 0.8 },
          metadata: {},
        },
      },
      { memoryPatchesRepository },
    );

    expect(result.ok).toBe(false);
    expect(patchCreateCalled).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
    }
  });

  it("writes memory patch then audit log through repository boundaries", async () => {
    const createdPatches: Array<PublicTableInsert<"memory_patches">> = [];
    const createdAuditLogs: Array<PublicTableInsert<"audit_logs">> = [];

    const memoryPatchesRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        const values = { ...input.values, user_id: input.context.userId } satisfies PublicTableInsert<"memory_patches">;
        createdPatches.push(values);
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
        createdAuditLogs.push(values);
        return repositoryOk(auditLogRow(values));
      },
    } satisfies ReturnType<typeof createAuditLogsRepository>;

    const result = await saveMemoryPatch(
      {
        context,
        candidate: validPatchCandidate,
      },
      {
        memoryPatchesRepository,
        auditLogsRepository,
      },
    );

    expect(result.ok).toBe(true);
    expect(createdPatches).toHaveLength(1);
    expect(createdAuditLogs).toHaveLength(1);
    expect(createdPatches[0].user_id).toBe("user_id");
    expect(createdAuditLogs[0]).toMatchObject({
      user_id: "user_id",
      namespace: "real_life",
      action: "memory_patch_created",
      table_name: "memory_items",
      record_id: "memory_item_id",
    });

    if (result.ok) {
      expect(result.data.patch.id).toBe("memory_patch_id");
      expect(result.data.auditLog.id).toBe("audit_log_id");
    }
  });

  it("returns patch repository errors before audit writes", async () => {
    let auditCreateCalled = false;
    const memoryPatchesRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create() {
        return repositoryError("database_error", "patch failed");
      },
    } satisfies ReturnType<typeof createMemoryPatchesRepository>;

    const auditLogsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create() {
        auditCreateCalled = true;
        return repositoryError("database_error", "should not be called");
      },
    } satisfies ReturnType<typeof createAuditLogsRepository>;

    const result = await saveMemoryPatch(
      {
        context,
        candidate: validPatchCandidate,
      },
      {
        memoryPatchesRepository,
        auditLogsRepository,
      },
    );

    expect(result.ok).toBe(false);
    expect(auditCreateCalled).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("database_error");
    }
  });

  it("returns audit errors after patch write attempts", async () => {
    const memoryPatchesRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        return repositoryOk(memoryPatchRow({ ...input.values, user_id: input.context.userId }));
      },
    } satisfies ReturnType<typeof createMemoryPatchesRepository>;

    const auditLogsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create() {
        return repositoryError("database_error", "audit failed");
      },
    } satisfies ReturnType<typeof createAuditLogsRepository>;

    const result = await saveMemoryPatch(
      {
        context,
        candidate: validPatchCandidate,
      },
      {
        memoryPatchesRepository,
        auditLogsRepository,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("database_error");
    }
  });
});
