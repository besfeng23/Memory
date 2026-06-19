import { describe, expect, it } from "vitest";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import { createAuditLogsRepository, createPromptLogsRepository, createRetrievalLogsRepository } from "@/lib/db/core-repositories";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { AuditLogRow, PromptLogRow, PublicTableInsert, RetrievalLogRow } from "@/lib/supabase/database.types";
import {
  prepareAuditLog,
  preparePromptLog,
  prepareRetrievalLog,
  writeAuditLog,
  writePromptLog,
  writeRetrievalLog,
} from "@/lib/memory/services/logging-service";

const context: RepositoryContext = {
  userId: "user_id",
  namespace: "real_life",
};

function retrievalLogRow(values: PublicTableInsert<"retrieval_logs">): RetrievalLogRow {
  return {
    id: "retrieval_log_id",
    user_id: values.user_id,
    namespace: values.namespace,
    query_text: values.query_text,
    filters: values.filters,
    requested_limit: values.requested_limit,
    returned_item_ids: values.returned_item_ids,
    metadata: values.metadata,
    created_at: values.created_at ?? "2026-01-01T00:00:00.000Z",
  };
}

function promptLogRow(values: PublicTableInsert<"prompt_logs">): PromptLogRow {
  return {
    id: "prompt_log_id",
    user_id: values.user_id,
    namespace: values.namespace,
    route_name: values.route_name,
    model_name: values.model_name,
    request_hash: values.request_hash,
    response_hash: values.response_hash,
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

describe("logging service prepare helpers", () => {
  it("prepares retrieval logs with context namespace", () => {
    const prepared = prepareRetrievalLog({
      context,
      queryText: "business contract",
      filters: { type: "business_fact" },
      requestedLimit: 10,
      returnedItemIds: ["memory_1"],
      metadata: { source: "test" },
    });

    expect(prepared).toMatchObject({
      namespace: "real_life",
      query_text: "business contract",
      requested_limit: 10,
      returned_item_ids: ["memory_1"],
    });
    expect(prepared).not.toHaveProperty("user_id");
  });

  it("prepares prompt logs without raw prompt text", () => {
    const prepared = preparePromptLog({
      context,
      routeName: "memory.extract",
      modelName: "model-name",
      requestHash: "request-hash",
      responseHash: "response-hash",
      metadata: { tokenEstimate: 10 },
    });

    expect(prepared).toMatchObject({
      namespace: "real_life",
      route_name: "memory.extract",
      model_name: "model-name",
      request_hash: "request-hash",
      response_hash: "response-hash",
    });
    expect(prepared).not.toHaveProperty("prompt");
    expect(prepared).not.toHaveProperty("response");
  });

  it("prepares audit logs with snapshots", () => {
    const prepared = prepareAuditLog({
      context,
      action: "memory_candidate_saved",
      tableName: "memory_items",
      recordId: "memory_1",
      beforeSnapshot: null,
      afterSnapshot: { title: "Memory" },
      metadata: { service: "test" },
    });

    expect(prepared).toMatchObject({
      namespace: "real_life",
      action: "memory_candidate_saved",
      table_name: "memory_items",
      record_id: "memory_1",
      before_snapshot: null,
      after_snapshot: { title: "Memory" },
    });
    expect(prepared).not.toHaveProperty("user_id");
  });
});

describe("logging service writers", () => {
  it("writes retrieval logs through the repository boundary", async () => {
    const created: Array<PublicTableInsert<"retrieval_logs">> = [];
    const retrievalLogsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        const values = { ...input.values, user_id: input.context.userId } satisfies PublicTableInsert<"retrieval_logs">;
        created.push(values);
        return repositoryOk(retrievalLogRow(values));
      },
    } satisfies ReturnType<typeof createRetrievalLogsRepository>;

    const result = await writeRetrievalLog(
      {
        context,
        queryText: "query",
        returnedItemIds: ["memory_1"],
      },
      { retrievalLogsRepository },
    );

    expect(result.ok).toBe(true);
    expect(created[0].user_id).toBe("user_id");
    expect(created[0].namespace).toBe("real_life");
  });

  it("writes prompt logs through the repository boundary", async () => {
    const created: Array<PublicTableInsert<"prompt_logs">> = [];
    const promptLogsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        const values = { ...input.values, user_id: input.context.userId } satisfies PublicTableInsert<"prompt_logs">;
        created.push(values);
        return repositoryOk(promptLogRow(values));
      },
    } satisfies ReturnType<typeof createPromptLogsRepository>;

    const result = await writePromptLog(
      {
        context,
        routeName: "memory.extract",
        requestHash: "request-hash",
      },
      { promptLogsRepository },
    );

    expect(result.ok).toBe(true);
    expect(created[0].user_id).toBe("user_id");
    expect(created[0].namespace).toBe("real_life");
  });

  it("writes audit logs through the repository boundary", async () => {
    const created: Array<PublicTableInsert<"audit_logs">> = [];
    const auditLogsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        const values = { ...input.values, user_id: input.context.userId } satisfies PublicTableInsert<"audit_logs">;
        created.push(values);
        return repositoryOk(auditLogRow(values));
      },
    } satisfies ReturnType<typeof createAuditLogsRepository>;

    const result = await writeAuditLog(
      {
        context,
        action: "memory_candidate_saved",
        tableName: "memory_items",
        recordId: "memory_1",
        afterSnapshot: { id: "memory_1" },
      },
      { auditLogsRepository },
    );

    expect(result.ok).toBe(true);
    expect(created[0].user_id).toBe("user_id");
    expect(created[0].namespace).toBe("real_life");
  });

  it("returns repository errors without swallowing them", async () => {
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

    const result = await writeAuditLog(
      {
        context,
        action: "memory_candidate_failed",
        tableName: "memory_items",
      },
      { auditLogsRepository },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("database_error");
    }
  });
});
