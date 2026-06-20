import type { MemoryIngestResponseCacheRow, PublicTableInsert } from "@/lib/supabase/database.types";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryError, type RepositoryResult } from "@/lib/db/repository-result";

export const MEMORY_INGEST_RESPONSE_CACHE_TABLE = "memory_ingest_response_cache" as const;

export type MemoryIngestResponseCacheTable = typeof MEMORY_INGEST_RESPONSE_CACHE_TABLE;

export type ResponseCacheCreateInput = {
  context: RepositoryContext;
  values: Omit<PublicTableInsert<MemoryIngestResponseCacheTable>, "user_id">;
};

export type ResponseCacheReadInput = {
  context: RepositoryContext;
  id: string;
};

export type ResponseCacheLookupInput = {
  context: RepositoryContext;
  idempotencyKey: string;
};

export type ResponseCacheRepositoryContract = {
  getById(input: ResponseCacheReadInput): Promise<RepositoryResult<MemoryIngestResponseCacheRow>>;
  getByKey(input: ResponseCacheLookupInput): Promise<RepositoryResult<MemoryIngestResponseCacheRow>>;
  create(input: ResponseCacheCreateInput): Promise<RepositoryResult<MemoryIngestResponseCacheRow>>;
};

function disabledResult(operation: string): RepositoryResult<MemoryIngestResponseCacheRow> {
  return repositoryError("validation_failed", "Response cache repository is disabled.", {
    operation,
    tableName: MEMORY_INGEST_RESPONSE_CACHE_TABLE,
  });
}

export function createDisabledResponseCacheRepository(): ResponseCacheRepositoryContract {
  return {
    async getById() {
      return disabledResult("getById");
    },
    async getByKey() {
      return disabledResult("getByKey");
    },
    async create() {
      return disabledResult("create");
    },
  };
}
