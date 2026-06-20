import { describe, expect, it } from "vitest";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import type { IdempotencyRpcClient } from "@/lib/services/idempotency-rpc";
import type { MemoryItemRow, MemorySourceRow } from "@/lib/supabase/database.types";
import { saveMemoryCandidateTransaction } from "@/lib/memory/services/candidate-transaction-service";

const context: RepositoryContext = { userId: "user_id", namespace: "real_life", requestId: "request_id" };

const input = {
  context,
  safety: { clientKey: "key" },
  candidate: {
    namespace: "real_life" as const,
    memory_type: "observation" as const,
    title: "Stored title",
    body: "Stored body.",
    strength: "medium" as const,
    confidence: 0.8,
    canon_status: "draft" as const,
    metadata: {},
    sources: [{ source_type: "user_statement" as const, confidence: 0.9, metadata: {} }],
  },
};

const client: IdempotencyRpcClient = {
  async rpc() {
    return {
      data: [{ memory_item_id: "memory_id", source_ids: ["source_id"], idempotency_record_id: "idem_id", was_claimed: true, existing_status: "completed" }],
      error: null,
    };
  },
};

const readMemory: MemoryItemRow = {
  id: "memory_id",
  user_id: "user_id",
  namespace: "real_life",
  memory_type: "observation",
  title: "Readback title",
  body: "Readback body.",
  strength: "medium",
  confidence: 0.8,
  canon_status: "active",
  source_summary: null,
  metadata: { stored: true },
  is_active: true,
  created_at: "db_time",
  updated_at: "db_time",
};

const readSource: MemorySourceRow = {
  id: "source_id",
  user_id: "user_id",
  namespace: "real_life",
  memory_item_id: "memory_id",
  source_type: "user_statement",
  source_ref: null,
  excerpt: null,
  confidence: 0.9,
  metadata: { stored: true },
  created_at: "db_time",
};

describe("candidate transaction readback", () => {
  it("can return exact rows from repository readback", async () => {
    const result = await saveMemoryCandidateTransaction(input, {
      createClient: async () => client,
      readBack: true,
      memoryItemsRepository: {
        async getById() { return repositoryOk(readMemory); },
        async list() { return repositoryOk([]); },
        async create() { return repositoryError("database_error", "not used"); },
      },
      memorySourcesRepository: {
        async getById() { return repositoryOk(readSource); },
        async list() { return repositoryOk([]); },
        async create() { return repositoryError("database_error", "not used"); },
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.memoryItem.title).toBe("Readback title");
      expect(result.data.sources[0].created_at).toBe("db_time");
      expect(result.data.idempotencyRecordId).toBe("idem_id");
    }
  });
});
