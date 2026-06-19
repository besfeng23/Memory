import { describe, expect, it } from "vitest";
import { createMemoryItemsRepository, createRetrievalLogsRepository } from "@/lib/db/core-repositories";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import type { MemoryItemRow, PublicTableInsert, RetrievalLogRow } from "@/lib/supabase/database.types";
import { getMemoryItemById, retrieveMemoryItems } from "@/lib/memory/services/retrieval-service";

const context: RepositoryContext = {
  userId: "user_id",
  namespace: "real_life",
};

function memoryItem(overrides: Partial<MemoryItemRow>): MemoryItemRow {
  return {
    id: "memory_item_id",
    user_id: "user_id",
    namespace: "real_life",
    memory_type: "observation",
    title: "Default title",
    body: "Default body",
    strength: "medium",
    confidence: 0.5,
    canon_status: "draft",
    source_summary: null,
    metadata: {},
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

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

describe("retrieval service scaffold", () => {
  it("retrieves memory items through the owner and namespace filtered repository", async () => {
    const memoryItemsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list(input) {
        expect(input.context).toEqual(context);
        expect(input.tableName).toBe("memory_items");
        return repositoryOk([
          memoryItem({ id: "match", title: "Contract review", memory_type: "business_fact", strength: "high" }),
          memoryItem({ id: "miss", title: "Other memory", memory_type: "observation", strength: "medium" }),
        ]);
      },
      async create() {
        return repositoryError("database_error", "not used");
      },
    } satisfies ReturnType<typeof createMemoryItemsRepository>;

    const result = await retrieveMemoryItems(
      {
        context,
        queryText: "contract",
        filters: { memoryType: "business_fact", strength: "high" },
        limit: 10,
      },
      { memoryItemsRepository },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items.map((item) => item.id)).toEqual(["match"]);
      expect(result.data.returnedItemIds).toEqual(["match"]);
      expect(result.data.logged).toBe(false);
    }
  });

  it("filters inactive rows by default", async () => {
    const memoryItemsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([
          memoryItem({ id: "active", is_active: true }),
          memoryItem({ id: "inactive", is_active: false }),
        ]);
      },
      async create() {
        return repositoryError("database_error", "not used");
      },
    } satisfies ReturnType<typeof createMemoryItemsRepository>;

    const result = await retrieveMemoryItems({ context }, { memoryItemsRepository });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.returnedItemIds).toEqual(["active"]);
    }
  });

  it("can include inactive rows when requested", async () => {
    const memoryItemsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([
          memoryItem({ id: "active", is_active: true }),
          memoryItem({ id: "inactive", is_active: false }),
        ]);
      },
      async create() {
        return repositoryError("database_error", "not used");
      },
    } satisfies ReturnType<typeof createMemoryItemsRepository>;

    const result = await retrieveMemoryItems(
      {
        context,
        filters: { activeOnly: false },
      },
      { memoryItemsRepository },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.returnedItemIds).toEqual(["active", "inactive"]);
    }
  });

  it("writes retrieval logs when requested", async () => {
    const createdLogs: Array<PublicTableInsert<"retrieval_logs">> = [];
    const memoryItemsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([memoryItem({ id: "match", title: "Promise tracking" })]);
      },
      async create() {
        return repositoryError("database_error", "not used");
      },
    } satisfies ReturnType<typeof createMemoryItemsRepository>;

    const retrievalLogsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        const values = { ...input.values, user_id: input.context.userId } satisfies PublicTableInsert<"retrieval_logs">;
        createdLogs.push(values);
        return repositoryOk(retrievalLogRow(values));
      },
    } satisfies ReturnType<typeof createRetrievalLogsRepository>;

    const result = await retrieveMemoryItems(
      {
        context,
        queryText: "promise",
        filters: { memoryType: "observation" },
        logRetrieval: true,
      },
      { memoryItemsRepository, retrievalLogsRepository },
    );

    expect(result.ok).toBe(true);
    expect(createdLogs).toHaveLength(1);
    expect(createdLogs[0]).toMatchObject({
      user_id: "user_id",
      namespace: "real_life",
      query_text: "promise",
      returned_item_ids: ["match"],
    });

    if (result.ok) {
      expect(result.data.logged).toBe(true);
    }
  });

  it("returns retrieval log write errors", async () => {
    const memoryItemsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([memoryItem({ id: "match" })]);
      },
      async create() {
        return repositoryError("database_error", "not used");
      },
    } satisfies ReturnType<typeof createMemoryItemsRepository>;

    const retrievalLogsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create() {
        return repositoryError("database_error", "log failed");
      },
    } satisfies ReturnType<typeof createRetrievalLogsRepository>;

    const result = await retrieveMemoryItems(
      {
        context,
        logRetrieval: true,
      },
      { memoryItemsRepository, retrievalLogsRepository },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("database_error");
    }
  });

  it("reads a single memory item by id through repository boundaries", async () => {
    const memoryItemsRepository = {
      async getById(input) {
        expect(input.context).toEqual(context);
        expect(input.tableName).toBe("memory_items");
        expect(input.id).toBe("memory_item_id");
        return repositoryOk(memoryItem({ id: input.id }));
      },
      async list() {
        return repositoryOk([]);
      },
      async create() {
        return repositoryError("database_error", "not used");
      },
    } satisfies ReturnType<typeof createMemoryItemsRepository>;

    const result = await getMemoryItemById(context, "memory_item_id", { memoryItemsRepository });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("memory_item_id");
    }
  });
});
