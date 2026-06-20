import { describe, expect, it } from "vitest";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import { runMemoryIngestDryRunCandidate } from "@/lib/services/memory-ingest-dry-run-candidate";

const context: RepositoryContext = { userId: "server-auth-user", namespace: "real_life" };

function makeRequest(namespace: FutureMemoryIngestRequest["namespace"], metadata: Record<string, unknown> = {}): FutureMemoryIngestRequest {
  return {
    namespace,
    input: "Remember this in dry run only.",
    source_ref: null,
    idempotency_key: "dry-run-key-1234",
    metadata,
  };
}

describe("runMemoryIngestDryRunCandidate", () => {
  it("returns a completed no-write, no-model dry-run result for real_life", async () => {
    const result = await runMemoryIngestDryRunCandidate({
      context,
      request: makeRequest("real_life"),
      requestHash: "hash",
      fingerprint: "fingerprint",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toHaveProperty("memoryItemId");
    expect(result.data.sourceIds).toEqual([]);
    expect(result.data.warnings).toContain("dry_run_only");
    expect(result.data.dryRun).toMatchObject({
      wouldClassify: true,
      wouldExtractCandidates: true,
      wouldValidateNamespace: true,
      wouldPersist: false,
      wouldCallModel: false,
      namespacePolicy: "real_life_explicit",
      userIdSource: "server_auth_context",
      appendOnlyFutureWrites: true,
      persistencePreflight: {
        status: "ready",
        wouldPersist: false,
        wouldCallModel: false,
        wouldUseClientUserId: false,
      },
      writePlan: {
        status: "planned",
        appendOnly: true,
        wouldPersist: false,
        wouldCallModel: false,
        wouldPerformRetrieval: false,
        blockers: [],
      },
      executionReport: {
        status: "executed_dry_run",
        wouldPersist: false,
        writesPerformed: false,
        wouldCallModel: false,
        wouldPerformRetrieval: false,
        appendOnly: true,
        usesClientUserId: false,
        blockers: [],
      },
    });
  });

  it("keeps AU/story namespace handling explicit and not real-life evidence", async () => {
    const result = await runMemoryIngestDryRunCandidate({
      context: { ...context, namespace: "au" },
      request: makeRequest("au", { user_id: "client-supplied-user-must-not-be-trusted" }),
      requestHash: "hash",
      fingerprint: "fingerprint",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.namespace).toBe("au");
    expect(result.data.dryRun.namespacePolicy).toBe("au_explicit_story_only");
    expect(result.data.dryRun.persistencePreflight.namespaceIsolation.auContentRemainsFictionalStoryScoped).toBe(true);
  });
  it("includes extraction summary metadata when present", async () => {
    const result = await runMemoryIngestDryRunCandidate({
      context,
      request: makeRequest("real_life", {
        extractionSummary: {
          namespaceClassification: "real_life",
          extractedCandidateCount: 2,
          validatedCandidateCount: 1,
          rejectedCandidateCount: 1,
          sensitiveCandidateCount: 1,
          requiresReview: true,
          wouldCallModel: false,
          wouldPersist: false,
        },
      }),
      requestHash: "hash",
      fingerprint: "fingerprint",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.dryRun).toMatchObject({
      namespaceClassification: "real_life",
      extractedCandidateCount: 2,
      validatedCandidateCount: 1,
      rejectedCandidateCount: 1,
      sensitiveCandidateCount: 1,
      requiresReview: true,
      noModelCallConfirmed: true,
      noPersistenceConfirmed: true,
    });
  });

});
