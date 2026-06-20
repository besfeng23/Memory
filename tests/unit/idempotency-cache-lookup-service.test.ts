import { describe, expect, it } from "vitest";
import { lookupIdempotencyCache } from "@/lib/services/idempotency-cache-lookup-service";
import { createRequestHash } from "@/lib/api/request-fingerprint";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryIngestResponseCacheRow } from "@/lib/supabase/database.types";

const context: RepositoryContext = { userId: "user_a", namespace: "real_life" };
const route = "/api/memory/ingest";

function cachedRow(requestHash: string): MemoryIngestResponseCacheRow {
  return {
    id: "cache_1",
    user_id: "user_a",
    namespace: "real_life",
    idempotency_key: "key-1234",
    request_hash: requestHash,
    response_status: 200,
    response_body: { ok: true },
    warnings: [],
    metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-01-02T00:00:00.000Z",
    last_replayed_at: null,
    replay_count: 0,
  };
}

describe("lookupIdempotencyCache", () => {
  it("returns a miss when no key is present", async () => {
    const result = await lookupIdempotencyCache({
      context,
      route,
      body: { text: "hello" },
      repository: { getByKey: async () => repositoryError("not_found", "not found") },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("miss");
      expect(result.data.keyPresent).toBe(false);
    }
  });

  it("returns a hit when the stored request hash matches", async () => {
    const body = { text: "hello" };
    const result = await lookupIdempotencyCache({
      context,
      route,
      body,
      idempotencyKey: "key-1234",
      repository: { getByKey: async () => repositoryOk(cachedRow(createRequestHash(body))) },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("hit");
    }
  });

  it("returns a conflict when the stored request hash differs", async () => {
    const result = await lookupIdempotencyCache({
      context,
      route,
      body: { text: "hello" },
      idempotencyKey: "key-1234",
      repository: { getByKey: async () => repositoryOk(cachedRow("different-hash")) },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("conflict");
    }
  });
});
