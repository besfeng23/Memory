import type { Json } from "@/lib/supabase/database.types";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { RepositoryResult } from "@/lib/db/repository-result";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import type { ResponseCacheRepositoryContract } from "@/lib/db/response-cache-contract";
import { lookupIdempotencyCache } from "@/lib/services/idempotency-cache-lookup-service";

export type IdempotencyConflictCheckInput = {
  context: RepositoryContext;
  route: string;
  body: Json;
  idempotencyKey?: string | null;
  repository: Pick<ResponseCacheRepositoryContract, "getByKey">;
};

export type IdempotencyConflictCheckResult = {
  conflict: boolean;
  status: "not_applicable" | "clear" | "replay_available" | "conflict";
  requestHash: string;
  fingerprint: string;
  keyPresent: boolean;
  cachedRequestHash?: string;
};

export async function detectIdempotencyConflict(
  input: IdempotencyConflictCheckInput,
): Promise<RepositoryResult<IdempotencyConflictCheckResult>> {
  const lookup = await lookupIdempotencyCache(input);

  if (!lookup.ok) {
    return lookup;
  }

  if (lookup.data.status === "miss") {
    return repositoryOk({
      conflict: false,
      status: lookup.data.keyPresent ? "clear" : "not_applicable",
      requestHash: lookup.data.requestHash,
      fingerprint: lookup.data.fingerprint,
      keyPresent: lookup.data.keyPresent,
    });
  }

  if (lookup.data.status === "hit") {
    return repositoryOk({
      conflict: false,
      status: "replay_available",
      requestHash: lookup.data.requestHash,
      fingerprint: lookup.data.fingerprint,
      keyPresent: true,
      cachedRequestHash: lookup.data.cached.request_hash,
    });
  }

  return repositoryOk({
    conflict: true,
    status: "conflict",
    requestHash: lookup.data.requestHash,
    fingerprint: lookup.data.fingerprint,
    keyPresent: true,
    cachedRequestHash: lookup.data.cached.request_hash,
  });
}

export function requireNoIdempotencyConflict(
  result: IdempotencyConflictCheckResult,
): RepositoryResult<IdempotencyConflictCheckResult> {
  if (!result.conflict) {
    return repositoryOk(result);
  }

  return repositoryError("idempotency_conflict", "Idempotency key was already used for a different request.", {
    cachedRequestHash: result.cachedRequestHash,
    requestHash: result.requestHash,
  });
}
