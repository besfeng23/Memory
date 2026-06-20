import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MemoryIngestResponseCacheRow, PublicTableInsert } from "@/lib/supabase/database.types";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";

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

type QueryError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type QueryResult<T> = Promise<{
  data: T | null;
  error: QueryError | null;
}>;

type SelectBuilder = {
  eq(column: string, value: string): SelectBuilder;
  maybeSingle(): QueryResult<Record<string, unknown>>;
};

type InsertBuilder = {
  select(columns: string): {
    single(): QueryResult<Record<string, unknown>>;
  };
};

export type ResponseCacheQueryClient = {
  from(tableName: MemoryIngestResponseCacheTable): {
    select(columns: string): SelectBuilder;
    insert(values: Record<string, unknown>): InsertBuilder;
  };
};

export type ResponseCacheRepositoryOptions = {
  createClient?: () => Promise<ResponseCacheQueryClient>;
};

function toClient(client: unknown): ResponseCacheQueryClient {
  return client as ResponseCacheQueryClient;
}

async function createDefaultClient(): Promise<ResponseCacheQueryClient> {
  return toClient(await createSupabaseServerClient());
}

function queryDetails(error: QueryError): Record<string, unknown> {
  return {
    code: error.code,
    details: error.details,
    hint: error.hint,
  };
}

function assertContext(context: RepositoryContext): RepositoryResult<true> {
  if (!context.userId) {
    return repositoryError("auth_required", "Authenticated user is required.");
  }

  return repositoryOk(true);
}

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

export function createResponseCacheRepository(
  options: ResponseCacheRepositoryOptions = {},
): ResponseCacheRepositoryContract {
  const createClient = options.createClient ?? createDefaultClient;

  return {
    async getById(input) {
      const context = assertContext(input.context);
      if (!context.ok) return context;

      const client = await createClient();
      const result = await client
        .from(MEMORY_INGEST_RESPONSE_CACHE_TABLE)
        .select("*")
        .eq("id", input.id)
        .eq("user_id", input.context.userId)
        .eq("namespace", input.context.namespace)
        .maybeSingle();

      if (result.error) {
        return repositoryError("database_error", result.error.message ?? "Response cache read failed.", queryDetails(result.error));
      }

      if (!result.data) {
        return repositoryError("not_found", "Response cache row was not found.", { id: input.id });
      }

      return repositoryOk(result.data as MemoryIngestResponseCacheRow);
    },

    async getByKey(input) {
      const context = assertContext(input.context);
      if (!context.ok) return context;

      const client = await createClient();
      const result = await client
        .from(MEMORY_INGEST_RESPONSE_CACHE_TABLE)
        .select("*")
        .eq("user_id", input.context.userId)
        .eq("namespace", input.context.namespace)
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();

      if (result.error) {
        return repositoryError("database_error", result.error.message ?? "Response cache lookup failed.", queryDetails(result.error));
      }

      if (!result.data) {
        return repositoryError("not_found", "Response cache key was not found.", { keyPresent: Boolean(input.idempotencyKey) });
      }

      return repositoryOk(result.data as MemoryIngestResponseCacheRow);
    },

    async create(input) {
      const context = assertContext(input.context);
      if (!context.ok) return context;

      const values: PublicTableInsert<MemoryIngestResponseCacheTable> = {
        ...input.values,
        user_id: input.context.userId,
        namespace: input.context.namespace,
      };

      const client = await createClient();
      const result = await client
        .from(MEMORY_INGEST_RESPONSE_CACHE_TABLE)
        .insert(values as Record<string, unknown>)
        .select("*")
        .single();

      if (result.error) {
        return repositoryError("database_error", result.error.message ?? "Response cache create failed.", queryDetails(result.error));
      }

      if (!result.data) {
        return repositoryError("database_error", "Response cache create returned no row.");
      }

      return repositoryOk(result.data as MemoryIngestResponseCacheRow);
    },
  };
}
