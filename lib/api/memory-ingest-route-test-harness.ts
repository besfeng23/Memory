import type { User } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/database.types";
import { futureMemoryIngestRequestSchema } from "@/lib/api/route-contracts";
import { createRouteRepositoryContext } from "@/lib/api/route-repository-context";
import { getMemoryIngestTestModeState, type MemoryIngestRuntimeEnv } from "@/lib/api/memory-ingest-test-mode";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { ResponseCacheRepositoryContract } from "@/lib/db/response-cache-contract";
import { runGuardedIngest, type GuardedIngestCandidateRunner, type GuardedIngestResult } from "@/lib/services/guarded-ingest-service";

export type MemoryIngestRouteTestHarnessInput = {
  env: MemoryIngestRuntimeEnv;
  user: Pick<User, "id"> | null;
  route?: string;
  requestId?: string;
  body: unknown;
  responseCacheRepository: Pick<ResponseCacheRepositoryContract, "getByKey">;
  runCandidate: GuardedIngestCandidateRunner;
};

export type MemoryIngestRouteTestHarnessResult = {
  status: 200;
  route: string;
  body: GuardedIngestResult;
};

export async function runMemoryIngestRouteTestHarness(
  input: MemoryIngestRouteTestHarnessInput,
): Promise<RepositoryResult<MemoryIngestRouteTestHarnessResult>> {
  const route = input.route ?? "/api/memory/ingest";
  const mode = getMemoryIngestTestModeState(input.env);

  if (!mode.enabled) {
    return repositoryError("validation_failed", "Memory ingest test harness is disabled.", { mode: mode.mode, route });
  }

  const parsed = futureMemoryIngestRequestSchema.safeParse(input.body);
  if (!parsed.success) {
    return repositoryError("validation_failed", "Invalid memory ingest test request.", { issues: parsed.error.flatten() });
  }

  const context = createRouteRepositoryContext({
    user: input.user,
    namespace: parsed.data.namespace,
    requestId: input.requestId,
  });
  if (!context.ok) return context;

  const result = await runGuardedIngest({
    enabled: true,
    context: context.data,
    route,
    request: parsed.data,
    responseCacheRepository: input.responseCacheRepository,
    runCandidate: input.runCandidate,
  });

  if (!result.ok) return result;

  return repositoryOk({
    status: 200,
    route,
    body: result.data as Json as GuardedIngestResult,
  });
}
