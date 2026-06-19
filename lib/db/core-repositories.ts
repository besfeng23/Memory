import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PublicTableInsert, PublicTableName, PublicTableRow } from "@/lib/supabase/database.types";
import { prepareOwnedInsert } from "@/lib/services/service-boundary";
import type {
  PandoraRepository,
  RepositoryCreateInput,
  RepositoryListInput,
  RepositoryReadInput,
} from "@/lib/db/repository-contracts";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import { assertTableNamespace } from "@/lib/db/repository-guards";

export const SAFE_CORE_REPOSITORY_TABLES = [
  "memory_items",
  "memory_sources",
  "memory_patches",
  "retrieval_logs",
  "prompt_logs",
  "audit_logs",
] as const satisfies readonly PublicTableName[];

export type SafeCoreRepositoryTable = (typeof SAFE_CORE_REPOSITORY_TABLES)[number];

export type CoreQueryError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export type CoreQueryResult<T> = Promise<{
  data: T | null;
  error: CoreQueryError | null;
}>;

type CoreSelectBuilder = {
  eq(column: string, value: string): CoreSelectBuilder;
  order(column: string, options: { ascending: boolean }): CoreSelectBuilder;
  limit(count: number): CoreQueryResult<Record<string, unknown>[]>;
  maybeSingle(): CoreQueryResult<Record<string, unknown>>;
};

type CoreInsertBuilder = {
  select(columns: string): {
    single(): CoreQueryResult<Record<string, unknown>>;
  };
};

export type CoreQueryClient = {
  from(tableName: string): {
    select(columns: string): CoreSelectBuilder;
    insert(values: Record<string, unknown>): CoreInsertBuilder;
  };
};

export type ServerCoreRepositoryOptions = {
  createClient?: () => Promise<CoreQueryClient>;
  defaultLimit?: number;
  maxLimit?: number;
};

function toCoreQueryClient(client: unknown): CoreQueryClient {
  return client as CoreQueryClient;
}

async function createDefaultCoreQueryClient(): Promise<CoreQueryClient> {
  return toCoreQueryClient(await createSupabaseServerClient());
}

function normalizeLimit(limit: number | undefined, defaultLimit: number, maxLimit: number) {
  if (!limit || !Number.isFinite(limit) || limit <= 0) {
    return defaultLimit;
  }

  return Math.min(Math.floor(limit), maxLimit);
}

function errorDetails(error: CoreQueryError): Record<string, unknown> {
  return {
    code: error.code,
    details: error.details,
    hint: error.hint,
  };
}

export function createServerCoreRepository<TableName extends SafeCoreRepositoryTable>(
  tableName: TableName,
  options: ServerCoreRepositoryOptions = {},
): PandoraRepository<TableName> {
  const createClient = options.createClient ?? createDefaultCoreQueryClient;
  const defaultLimit = options.defaultLimit ?? 25;
  const maxLimit = options.maxLimit ?? 100;

  return {
    async getById(input: RepositoryReadInput<TableName>): Promise<RepositoryResult<PublicTableRow<TableName>>> {
      const tableCheck = assertTableNamespace(tableName, input.context.namespace);
      if (!tableCheck.ok) {
        return tableCheck;
      }

      const client = await createClient();
      const result = await client
        .from(tableName)
        .select("*")
        .eq("id", input.id)
        .eq("user_id", input.context.userId)
        .eq("namespace", input.context.namespace)
        .maybeSingle();

      if (result.error) {
        return repositoryError("database_error", result.error.message ?? "Database read failed.", errorDetails(result.error));
      }

      if (!result.data) {
        return repositoryError("not_found", "Repository row was not found.", { tableName, id: input.id });
      }

      return repositoryOk(result.data as PublicTableRow<TableName>);
    },

    async list(input: RepositoryListInput<TableName>): Promise<RepositoryResult<PublicTableRow<TableName>[]>> {
      const tableCheck = assertTableNamespace(tableName, input.context.namespace);
      if (!tableCheck.ok) {
        return tableCheck;
      }

      const client = await createClient();
      const result = await client
        .from(tableName)
        .select("*")
        .eq("user_id", input.context.userId)
        .eq("namespace", input.context.namespace)
        .order("created_at", { ascending: false })
        .limit(normalizeLimit(input.limit, defaultLimit, maxLimit));

      if (result.error) {
        return repositoryError("database_error", result.error.message ?? "Database list failed.", errorDetails(result.error));
      }

      return repositoryOk((result.data ?? []) as PublicTableRow<TableName>[]);
    },

    async create(input: RepositoryCreateInput<TableName>): Promise<RepositoryResult<PublicTableRow<TableName>>> {
      const prepared = prepareOwnedInsert({
        context: input.context,
        tableName,
        values: input.values,
      });

      if (!prepared.ok) {
        return prepared;
      }

      const client = await createClient();
      const result = await client
        .from(tableName)
        .insert(prepared.data as unknown as Record<string, unknown>)
        .select("*")
        .single();

      if (result.error) {
        return repositoryError("database_error", result.error.message ?? "Database create failed.", errorDetails(result.error));
      }

      if (!result.data) {
        return repositoryError("database_error", "Database create returned no row.", { tableName });
      }

      return repositoryOk(result.data as PublicTableRow<TableName>);
    },
  };
}

export function createMemoryItemsRepository(options?: ServerCoreRepositoryOptions) {
  return createServerCoreRepository("memory_items", options);
}

export function createMemorySourcesRepository(options?: ServerCoreRepositoryOptions) {
  return createServerCoreRepository("memory_sources", options);
}

export function createMemoryPatchesRepository(options?: ServerCoreRepositoryOptions) {
  return createServerCoreRepository("memory_patches", options);
}

export function createRetrievalLogsRepository(options?: ServerCoreRepositoryOptions) {
  return createServerCoreRepository("retrieval_logs", options);
}

export function createPromptLogsRepository(options?: ServerCoreRepositoryOptions) {
  return createServerCoreRepository("prompt_logs", options);
}

export function createAuditLogsRepository(options?: ServerCoreRepositoryOptions) {
  return createServerCoreRepository("audit_logs", options);
}
