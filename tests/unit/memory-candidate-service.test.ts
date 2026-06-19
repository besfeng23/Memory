import { describe, expect, it } from "vitest";
import { createMemoryItemsRepository, createMemorySourcesRepository } from "@/lib/db/core-repositories";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import { prepareMemoryCandidate, saveMemoryCandidate } from "@/lib/memory/services/candidate-service";
import type { MemoryItemRow, MemorySourceRow, PublicTableInsert } from "@/lib/supabase/database.types";

const context: RepositoryContext = {
  userId: "user_id",
  namespace: "real_life",
};

const validCandidate = {
  namespace: "real_life",
  memory_type: "business_fact",
  title: "Contract status",
  body: "A contract reached a serious review stage.",
  strength: "high",
  confidence: 0.9,
  canon_status: "draft",
  source_summary: "Documented review note",
  metadata: { project: "pandora" },
  sources: [
    {
      source_type: "document",
      source_ref: "document-1",
      excerpt: "Review note",
      confidence: 0.9,
      metadata: { page: 1 },
    },
  ],
} as const;

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

describe("memory candidate services", () => {
  it("prepares a validated memory candidate without persisting", () => {
    const result = prepareMemoryCandidate(
      {
        context,
        candidate: validCandidate,
      },
      { now: () => "2026-01-01T00:00:00.000Z" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.memoryItem).toMatchObject({
        namespace: "real_life",
        memory_type: "business_fact",
        title: "Contract status",
        updated_at: "2026-01-01T00:00:00.000Z",
      });
      expect(result.data.memoryItem).not.toHaveProperty("user_id");
      expect(result.data.sources).toHaveLength(1);
      expect(result.data.sources[0]).toMatchObject({
        source_type: "document",
        source_ref: "document-1",
      });
    }
  });

  it("rejects invalid candidates before repository calls", async () => {
    let createCalled = false;
    const memoryItemsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create() {
        createCalled = true;
        return repositoryError("database_error", "should not be called");
      },
    } satisfies ReturnType<typeof createMemoryItemsRepository>;

    const result = await saveMemoryCandidate(
      {
        context,
        candidate: {
          ...validCandidate,
          sources: [],
        },
      },
      {
        memoryItemsRepository,
        now: () => "2026-01-01T00:00:00.000Z",
      },
    );

    expect(result.ok).toBe(false);
    expect(createCalled).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
    }
  });

  it("saves memory item and sources through safe repositories", async () => {
    const createdItems: Array<PublicTableInsert<"memory_items">> = [];
    const createdSources: Array<PublicTableInsert<"memory_sources">> = [];

    const memoryItemsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        const values = {
          ...input.values,
          user_id: input.context.userId,
        } satisfies PublicTableInsert<"memory_items">;
        createdItems.push(values);
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
        const values = {
          ...input.values,
          user_id: input.context.userId,
        } satisfies PublicTableInsert<"memory_sources">;
        createdSources.push(values);
        return repositoryOk(memorySourceRow(values));
      },
    } satisfies ReturnType<typeof createMemorySourcesRepository>;

    const result = await saveMemoryCandidate(
      {
        context,
        candidate: validCandidate,
      },
      {
        memoryItemsRepository,
        memorySourcesRepository,
        now: () => "2026-01-01T00:00:00.000Z",
      },
    );

    expect(result.ok).toBe(true);
    expect(createdItems).toHaveLength(1);
    expect(createdSources).toHaveLength(1);
    expect(createdItems[0].user_id).toBe("user_id");
    expect(createdSources[0].memory_item_id).toBe("memory_item_id");

    if (result.ok) {
      expect(result.data.memoryItem.id).toBe("memory_item_id");
      expect(result.data.sources[0].id).toBe("memory_source_id");
      expect(result.data.warnings).toEqual([]);
    }
  });

  it("returns repository errors from source creation", async () => {
    const memoryItemsRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        return repositoryOk(memoryItemRow({ ...input.values, user_id: input.context.userId }));
      },
    } satisfies ReturnType<typeof createMemoryItemsRepository>;

    const memorySourcesRepository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create() {
        return repositoryError("database_error", "source failed");
      },
    } satisfies ReturnType<typeof createMemorySourcesRepository>;

    const result = await saveMemoryCandidate(
      {
        context,
        candidate: validCandidate,
      },
      {
        memoryItemsRepository,
        memorySourcesRepository,
        now: () => "2026-01-01T00:00:00.000Z",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("database_error");
    }
  });
});
