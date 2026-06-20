import { describe, expect, it } from "vitest";
import {
  assertRouteContractOnly,
  createRouteRepositoryContext,
  futureMemoryIngestRequestSchema,
  futureMemoryIngestResponseSchema,
  plannedRouteContracts,
} from "@/lib/api/route-contracts";

describe("route contracts", () => {
  it("keeps memory ingest contract-only before route exposure", () => {
    const ingest = assertRouteContractOnly("/api/memory/ingest");

    expect(ingest.ok).toBe(true);
    if (ingest.ok) {
      expect(ingest.data.status).toBe("contract_only");
      expect(ingest.data.requiresAuth).toBe(true);
      expect(ingest.data.mutatesMemory).toBe(true);
    }
  });

  it("rejects non-contract-only route assertions", () => {
    const search = assertRouteContractOnly("/api/memory/search");

    expect(search.ok).toBe(false);
    if (!search.ok) {
      expect(search.error.code).toBe("validation_error");
    }
  });

  it("validates future ingest request and response shapes", () => {
    const request = futureMemoryIngestRequestSchema.parse({
      namespace: "real_life",
      input: "Remember this later.",
      idempotency_key: "12345678",
    });

    expect(request.metadata).toEqual({});

    const response = futureMemoryIngestResponseSchema.parse({
      ok: true,
      namespace: "real_life",
      memoryItem: {
        id: "00000000-0000-4000-8000-000000000001",
        memory_type: "observation",
        title: "Memory title",
        body: "Memory body",
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

    expect(response.idempotency.status).toBe("completed");
  });

  it("builds repository context only for authenticated route use", () => {
    const ok = createRouteRepositoryContext({
      userId: "user_id",
      namespace: "au",
      requestId: "request_id",
    });

    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data).toEqual({ userId: "user_id", namespace: "au", requestId: "request_id" });
    }

    const missing = createRouteRepositoryContext({
      userId: "",
      namespace: "real_life",
    });

    expect(missing.ok).toBe(false);
  });

  it("does not mark planned memory routes as implemented", () => {
    expect(plannedRouteContracts.some((route) => route.status === "implemented")).toBe(false);
  });
});
