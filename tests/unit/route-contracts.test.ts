import { describe, expect, it } from "vitest";
import {
  assertRouteContractOnly,
  assertRouteDisabled,
  buildDisabledRouteIdempotencyContract,
  buildDisabledRouteResponseCacheContract,
  createRouteRepositoryContext,
  futureMemoryIngestRequestSchema,
  futureMemoryIngestResponseSchema,
  plannedRouteContracts,
} from "@/lib/api/route-contracts";

describe("route contracts", () => {
  it("keeps the route disabled", () => {
    const result = assertRouteDisabled("/api/memory/ingest");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("disabled_stub");
      expect(result.data.mutatesMemory).toBe(false);
    }
  });

  it("rejects disabled routes when contract-only is required", () => {
    const result = assertRouteContractOnly("/api/memory/ingest");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
    }
  });

  it("normalizes request fields", () => {
    const request = futureMemoryIngestRequestSchema.parse({
      namespace: "real_life",
      input: "  Remember this later.  ",
      idempotency_key: "  abc-1234  ",
    });

    expect(request.input).toBe("Remember this later.");
    expect(request.idempotency_key).toBe("abc-1234");
    expect(request.metadata).toEqual({});
  });

  it("builds a non-persistent idempotency contract for disabled routes", () => {
    expect(buildDisabledRouteIdempotencyContract("abc-1234")).toEqual({
      key_present: true,
      key_stored: false,
      claim_attempted: false,
      conflict_evaluated: false,
      conflict_status: "not_evaluated",
    });
  });

  it("builds a disabled response cache contract", () => {
    expect(buildDisabledRouteResponseCacheContract()).toEqual({
      cache_supported: false,
      cache_lookup_attempted: false,
      cache_write_attempted: false,
      replay_supported: false,
      replay_status: "not_available",
    });
  });

  it("rejects malformed idempotency keys", () => {
    const request = futureMemoryIngestRequestSchema.safeParse({
      namespace: "real_life",
      input: "Remember this later.",
      idempotency_key: "bad key",
    });

    expect(request.success).toBe(false);
  });

  it("validates response shape", () => {
    const response = futureMemoryIngestResponseSchema.parse({
      ok: true,
      namespace: "real_life",
      memoryItem: {
        id: "00000000-0000-4000-8000-000000000001",
        memory_type: "observation",
        title: "Title",
        body: "Body",
        strength: "medium",
        confidence: 0.8,
        canon_status: "draft",
        source_summary: null,
        metadata: {},
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: null,
      },
      sources: [],
      warnings: [],
      idempotency: {
        status: "completed",
        record_id: "00000000-0000-4000-8000-000000000002",
      },
    });
    expect(response.ok).toBe(true);
  });

  it("requires a user id for route repository context", () => {
    expect(createRouteRepositoryContext({ userId: "user_id", namespace: "au" }).ok).toBe(true);
    const result = createRouteRepositoryContext({ userId: "", namespace: "real_life" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("auth_required");
    }
  });

  it("does not mark planned route contracts as implemented", () => {
    expect(plannedRouteContracts.some((route) => route.status === "implemented")).toBe(false);
  });
});
