import { describe, expect, it } from "vitest";
import { detectIdempotencyConflict, requireNoIdempotencyConflict } from "@/lib/services/idempotency-conflict-service";
import { createRequestHash } from "@/lib/api/request-fingerprint";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryIngestResponseCacheRow } from "@/lib/supabase/database.types";

const context: RepositoryContext = { userId: "user_a", namespace: "real_life" };
const route = "/api/memory/ingest";

function row(requestHash: string): MemoryIngestResponseCacheRow {
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

describe("detectIdempotencyConflict", () => {
  it("returns not applicable when no key exists", async () => {
    const result = await detectIdempotencyConflict({
      context,
      route,
      body: { text: "hello" },
      repository: { getByKey: async () => repositoryError("not_found", "not found") },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("not_applicable");
      expect(result.data.conflict).toBe(false);
    }
  });

  it("returns replay available when the cached request matches", async () => {
    const body = { text: "hello" };
    const result = await detectIdempotencyConflict({
      context,
      route,
      body,
      idempotencyKey: "key-1234",
      repository: { getByKey: async () => repositoryOk(row(createRequestHash(body))) },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("replay_available");
      expect(result.data.conflict).toBe(false);
    }
  });

  it("returns conflict when the cached request differs", async () => {
    const result = await detectIdempotencyConflict({
      context,
      route,
      body: { text: "hello" },
      idempotencyKey: "key-1234",
      repository: { getByKey: async () => repositoryOk(row("different-hash")) },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("conflict");
      expect(result.data.conflict).toBe(true);
      const enforced = requireNoIdempotencyConflict(result.data);
      expect(enforced.ok).toBe(false);
      if (!enforced.ok) {
        expect(enforced.error.code).toBe("idempotency_conflict");
      }
    }
  });
});
