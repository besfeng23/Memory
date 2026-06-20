import { describe, expect, it } from "vitest";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import { runMemoryIngestPersistencePreflight } from "@/lib/services/memory-ingest-persistence-preflight";

function makeContext(namespace: FutureMemoryIngestRequest["namespace"]): RepositoryContext {
  return { userId: "server-auth-user", namespace, requestId: "req-1" };
}

function makeRequest(namespace: FutureMemoryIngestRequest["namespace"], metadata: Record<string, unknown> = {}): FutureMemoryIngestRequest {
  return {
    namespace,
    input: "Persist this later only after the real writer is enabled.",
    source_ref: null,
    idempotency_key: "preflight-key-1234",
    metadata,
  };
}

describe("runMemoryIngestPersistencePreflight", () => {
  it("returns ready for valid authenticated context and parsed request without persistence or model calls", async () => {
    const result = await runMemoryIngestPersistencePreflight({
      context: makeContext("real_life"),
      request: makeRequest("real_life"),
      requestHash: "hash",
      fingerprint: "fingerprint",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      status: "ready",
      namespace: "real_life",
      userId: "server-auth-user",
      wouldPersist: false,
      wouldCallModel: false,
      wouldCreateRetrievalLog: false,
      wouldUseAppendOnlyPatch: true,
      wouldValidateNamespaceIsolation: true,
      wouldCreateAuditLog: true,
      wouldUseClientUserId: false,
      blockers: [],
    });
    expect(result.data.requiredWriteTargets).toEqual(["memory_items", "memory_sources", "memory_patches", "audit_logs"]);
  });

  it("uses authenticated context user ID and ignores client-supplied user IDs", async () => {
    const result = await runMemoryIngestPersistencePreflight({
      context: makeContext("real_life"),
      request: makeRequest("real_life", { user_id: "client-user", userId: "clientUser" }),
      requestHash: "hash",
      fingerprint: "fingerprint",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.userId).toBe("server-auth-user");
    expect(result.data.wouldUseClientUserId).toBe(false);
    expect(result.data.warnings).toContain("client_user_id_ignored");
  });

  it.each(["real_life", "au"] as const)("allows %s only inside its own namespace", async (namespace) => {
    const result = await runMemoryIngestPersistencePreflight({
      context: makeContext(namespace),
      request: makeRequest(namespace),
      requestHash: "hash",
      fingerprint: "fingerprint",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("ready");
    expect(result.data.namespaceIsolation).toMatchObject({
      namespace,
      noCrossNamespacePersistence: true,
      realLifeCannotConsumeAuEvidence: true,
      auContentRemainsFictionalStoryScoped: true,
    });
  });

  it("blocks cross-namespace preflight behavior", async () => {
    const result = await runMemoryIngestPersistencePreflight({
      context: makeContext("real_life"),
      request: makeRequest("au"),
      requestHash: "hash",
      fingerprint: "fingerprint",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("blocked");
    expect(result.data.blockers).toContain("namespace_mismatch");
    expect(result.data.wouldPersist).toBe(false);
  });
});
