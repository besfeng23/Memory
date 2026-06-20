import type { Json } from "@/lib/supabase/database.types";
import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { ResponseCacheRepositoryContract } from "@/lib/db/response-cache-contract";
import type { MemoryIngestPersistencePreflightResult } from "@/lib/services/memory-ingest-persistence-preflight";
import { createRequestFingerprint, createRequestHash } from "@/lib/api/request-fingerprint";
import { detectIdempotencyConflict, requireNoIdempotencyConflict } from "@/lib/services/idempotency-conflict-service";

export const GUARDED_INGEST_FEATURE_FLAG = "PANDORA_ENABLE_GUARDED_INGEST" as const;

export type GuardedIngestFeatureEnv = Record<string, string | undefined>;

export function isGuardedIngestEnabled(env: GuardedIngestFeatureEnv = process.env): boolean {
  return env[GUARDED_INGEST_FEATURE_FLAG] === "true";
}

export type GuardedIngestCandidateInput = {
  context: RepositoryContext;
  request: FutureMemoryIngestRequest;
  requestHash: string;
  fingerprint: string;
};

export type GuardedIngestCandidateResult = {
  status: "completed";
  namespace: FutureMemoryIngestRequest["namespace"];
  memoryItemId?: string;
  sourceIds: string[];
  warnings: string[];
  dryRun?: {
    wouldClassify: boolean;
    wouldExtractCandidates: boolean;
    wouldValidateNamespace: boolean;
    wouldPersist: boolean;
    wouldCallModel: boolean;
    namespacePolicy?: "real_life_explicit" | "au_explicit_story_only";
    userIdSource?: "server_auth_context";
    appendOnlyFutureWrites?: boolean;
    persistencePreflight?: MemoryIngestPersistencePreflightResult;
  };
};

export type GuardedIngestCandidateRunner = (
  input: GuardedIngestCandidateInput,
) => Promise<RepositoryResult<GuardedIngestCandidateResult>>;

export type GuardedIngestInput = {
  enabled?: boolean;
  context: RepositoryContext;
  route: string;
  request: FutureMemoryIngestRequest;
  responseCacheRepository: Pick<ResponseCacheRepositoryContract, "getByKey">;
  runCandidate: GuardedIngestCandidateRunner;
};

export type GuardedIngestResult =
  | { status: "replay_unavailable"; requestHash: string; fingerprint: string }
  | GuardedIngestCandidateResult;

export async function runGuardedIngest(input: GuardedIngestInput): Promise<RepositoryResult<GuardedIngestResult>> {
  if (!input.enabled) {
    return repositoryError("validation_failed", "Guarded ingest is disabled.", { enabled: false, route: input.route });
  }

  const requestBody = input.request as unknown as Json;
  const requestHash = createRequestHash(requestBody);
  const fingerprint = createRequestFingerprint({
    body: requestBody,
    idempotencyKey: input.request.idempotency_key,
    namespace: input.context.namespace,
    route: input.route,
  });

  const conflict = await detectIdempotencyConflict({
    body: requestBody,
    context: input.context,
    idempotencyKey: input.request.idempotency_key,
    repository: input.responseCacheRepository,
    route: input.route,
  });

  if (!conflict.ok) return conflict;

  const noConflict = requireNoIdempotencyConflict(conflict.data);
  if (!noConflict.ok) return noConflict;

  if (conflict.data.status === "replay_available") {
    return repositoryOk({ status: "replay_unavailable", requestHash, fingerprint });
  }

  return input.runCandidate({ context: input.context, fingerprint, request: input.request, requestHash });
}
