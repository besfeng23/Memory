import type { Json, MemoryIngestResponseCacheRow } from "@/lib/supabase/database.types";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { RepositoryResult } from "@/lib/db/repository-result";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import type { ResponseCacheRepositoryContract } from "@/lib/db/response-cache-contract";
import { createRequestFingerprint, createRequestHash } from "@/lib/api/request-fingerprint";

export type IdempotencyCacheLookupInput = {
  context: RepositoryContext;
  route: string;
  body: Json;
  idempotencyKey?: string | null;
  repository: Pick<ResponseCacheRepositoryContract, "getByKey">;
};

export type IdempotencyCacheLookupMiss = {
  status: "miss";
  keyPresent: boolean;
  requestHash: string;
  fingerprint: string;
};

export type IdempotencyCacheLookupHit = {
  status: "hit";
  requestHash: string;
  fingerprint: string;
  cached: MemoryIngestResponseCacheRow;
};

export type IdempotencyCacheLookupConflict = {
  status: "conflict";
  requestHash: string;
  fingerprint: string;
  cached: MemoryIngestResponseCacheRow;
};

export type IdempotencyCacheLookupResult =
  | IdempotencyCacheLookupMiss
  | IdempotencyCacheLookupHit
  | IdempotencyCacheLookupConflict;

export async function lookupIdempotencyCache(
  input: IdempotencyCacheLookupInput,
): Promise<RepositoryResult<IdempotencyCacheLookupResult>> {
  const requestHash = createRequestHash(input.body);
  const fingerprint = createRequestFingerprint({
    body: input.body,
    idempotencyKey: input.idempotencyKey ?? null,
    namespace: input.context.namespace,
    route: input.route,
  });

  if (!input.idempotencyKey) {
    return repositoryOk({
      status: "miss",
      keyPresent: false,
      requestHash,
      fingerprint,
    });
  }

  const cached = await input.repository.getByKey({
    context: input.context,
    idempotencyKey: input.idempotencyKey,
  });

  if (!cached.ok) {
    if (cached.error.code === "not_found") {
      return repositoryOk({
        status: "miss",
        keyPresent: true,
        requestHash,
        fingerprint,
      });
    }

    return cached;
  }

  if (cached.data.request_hash !== requestHash) {
    return repositoryOk({
      status: "conflict",
      requestHash,
      fingerprint,
      cached: cached.data,
    });
  }

  return repositoryOk({
    status: "hit",
    requestHash,
    fingerprint,
    cached: cached.data,
  });
}

export function cacheLookupConflictError(result: IdempotencyCacheLookupConflict): RepositoryResult<never> {
  return repositoryError("idempotency_conflict", "Idempotency key was already used for a different request.", {
    cachedRequestHash: result.cached.request_hash,
    requestHash: result.requestHash,
  });
}
