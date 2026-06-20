import { repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import { runMemoryIngestPersistencePreflight, type MemoryIngestPersistencePreflightResult } from "@/lib/services/memory-ingest-persistence-preflight";
import type { GuardedIngestCandidateInput, GuardedIngestCandidateResult } from "@/lib/services/guarded-ingest-service";

export type MemoryIngestDryRunSummary = {
  wouldClassify: true;
  wouldExtractCandidates: true;
  wouldValidateNamespace: true;
  wouldPersist: false;
  wouldCallModel: false;
  namespacePolicy: "real_life_explicit" | "au_explicit_story_only";
  userIdSource: "server_auth_context";
  appendOnlyFutureWrites: true;
  persistencePreflight: MemoryIngestPersistencePreflightResult;
};

export type MemoryIngestDryRunCandidateResult = GuardedIngestCandidateResult & {
  dryRun: MemoryIngestDryRunSummary;
};

export async function runMemoryIngestDryRunCandidate(
  input: GuardedIngestCandidateInput,
): Promise<RepositoryResult<MemoryIngestDryRunCandidateResult>> {
  const namespacePolicy = input.request.namespace === "real_life" ? "real_life_explicit" : "au_explicit_story_only";

  const preflight = await runMemoryIngestPersistencePreflight({
    context: input.context,
    request: input.request,
    requestHash: input.requestHash,
    fingerprint: input.fingerprint,
    dryRunMetadata: { mode: "dry_run_only" },
  });

  if (!preflight.ok) return preflight;

  return repositoryOk({
    status: "completed",
    namespace: input.request.namespace,
    sourceIds: [],
    warnings: ["dry_run_only"],
    dryRun: {
      wouldClassify: true,
      wouldExtractCandidates: true,
      wouldValidateNamespace: true,
      wouldPersist: false,
      wouldCallModel: false,
      namespacePolicy,
      userIdSource: "server_auth_context",
      appendOnlyFutureWrites: true,
      persistencePreflight: preflight.data,
    },
  });
}
