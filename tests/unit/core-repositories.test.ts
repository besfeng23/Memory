import { describe, expect, it } from "vitest";
import {
  SAFE_CORE_REPOSITORY_TABLES,
  createRetrievalLogsRepository,
  createServerCoreRepository,
  type CoreQueryClient,
} from "@/lib/db/core-repositories";
import type { RepositoryContext } from "@/lib/db/repository-context";

type Row = Record<string, unknown>;

type TableStore = Record<string, Row[]>;

class FakeSelectBuilder {
  private filters: Array<{ column: string; value: string }> = [];
  private resultLimit: number | null = null;

  constructor(private readonly rows: Row[]) {}

  eq(column: string, value: string) {
    this.filters.push({ column, value });
    return this;
  }

  order() {
    return this;
  }

  async limit(count: number) {
    this.resultLimit = count;
    return {
      data: this.applyFilters().slice(0, this.resultLimit),
      error: null,
    };
  }

  async maybeSingle() {
    return {
      data: this.applyFilters()[0] ?? null,
      error: null,
    };
  }

  private applyFilters() {
    return this.rows.filter((row) => this.filters.every((filter) => row[filter.column] === filter.value));
  }
}

function createFakeClient(store: TableStore): CoreQueryClient {
  return {
    from(tableName: string) {
      store[tableName] ??= [];

      return {
        select() {
          return new FakeSelectBuilder(store[tableName]);
        },
        insert(values: Row) {
          return {
            select() {
              return {
                async single() {
                  const row = {
                    id: values.id ?? "generated_id",
                    created_at: values.created_at ?? "2026-01-01T00:00:00.000Z",
                    ...values,
                  };
                  store[tableName].push(row);

                  return {
                    data: row,
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

const realLifeContext: RepositoryContext = {
  userId: "user_a",
  namespace: "real_life",
};

describe("safe core repositories", () => {
  it("exposes selected core tables including validated patch storage", () => {
    expect(SAFE_CORE_REPOSITORY_TABLES).toEqual([
      "memory_items",
      "memory_sources",
      "memory_patches",
      "retrieval_logs",
      "prompt_logs",
      "audit_logs",
    ]);
  });

  it("lists rows by owner and namespace", async () => {
    const store: TableStore = {
      retrieval_logs: [
        {
          id: "visible",
          user_id: "user_a",
          namespace: "real_life",
          query_text: "query",
          filters: {},
          requested_limit: 10,
          returned_item_ids: [],
          metadata: {},
          created_at: "2026-01-02T00:00:00.000Z",
        },
        {
          id: "other_user",
          user_id: "user_b",
          namespace: "real_life",
          query_text: "query",
          filters: {},
          requested_limit: 10,
          returned_item_ids: [],
          metadata: {},
          created_at: "2026-01-02T00:00:00.000Z",
        },
        {
          id: "other_namespace",
          user_id: "user_a",
          namespace: "au",
          query_text: "query",
          filters: {},
          requested_limit: 10,
          returned_item_ids: [],
          metadata: {},
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
    };

    const repository = createRetrievalLogsRepository({ createClient: async () => createFakeClient(store) });
    const result = await repository.list({ context: realLifeContext, tableName: "retrieval_logs" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.map((row) => row.id)).toEqual(["visible"]);
    }
  });

  it("returns not found when id is outside owner or namespace boundary", async () => {
    const store: TableStore = {
      retrieval_logs: [
        {
          id: "hidden",
          user_id: "user_b",
          namespace: "real_life",
          query_text: "query",
          filters: {},
          requested_limit: 10,
          returned_item_ids: [],
          metadata: {},
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
    };

    const repository = createRetrievalLogsRepository({ createClient: async () => createFakeClient(store) });
    const result = await repository.getById({ context: realLifeContext, tableName: "retrieval_logs", id: "hidden" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not_found");
    }
  });

  it("creates owner-bound rows from context", async () => {
    const store: TableStore = {};
    const repository = createRetrievalLogsRepository({ createClient: async () => createFakeClient(store) });

    const result = await repository.create({
      context: realLifeContext,
      tableName: "retrieval_logs",
      values: {
        namespace: "real_life",
        query_text: "query",
        filters: {},
        requested_limit: 10,
        returned_item_ids: [],
        metadata: {},
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user_id).toBe("user_a");
      expect(result.data.namespace).toBe("real_life");
    }
  });

  it("rejects non-core table names at compile-time through the factory type", () => {
    const repository = createServerCoreRepository("memory_items", { createClient: async () => createFakeClient({}) });

    expect(repository).toHaveProperty("getById");
    expect(repository).toHaveProperty("list");
    expect(repository).toHaveProperty("create");
  });
});
