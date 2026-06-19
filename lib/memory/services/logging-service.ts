import type { AuditLogRow, Json, PromptLogRow, PublicTableInsert, RetrievalLogRow } from "@/lib/supabase/database.types";
import type { RepositoryContext } from "@/lib/db/repository-context";
import {
  createAuditLogsRepository,
  createPromptLogsRepository,
  createRetrievalLogsRepository,
} from "@/lib/db/core-repositories";
import type { RepositoryResult } from "@/lib/db/repository-result";

export type LoggingServiceOptions = {
  retrievalLogsRepository?: ReturnType<typeof createRetrievalLogsRepository>;
  promptLogsRepository?: ReturnType<typeof createPromptLogsRepository>;
  auditLogsRepository?: ReturnType<typeof createAuditLogsRepository>;
};

export type RetrievalLogInput = {
  context: RepositoryContext;
  queryText: string;
  filters?: Json;
  requestedLimit?: number | null;
  returnedItemIds?: string[];
  metadata?: Json;
};

export type PromptLogInput = {
  context: RepositoryContext;
  routeName?: string | null;
  modelName?: string | null;
  requestHash?: string | null;
  responseHash?: string | null;
  metadata?: Json;
};

export type AuditLogInput = {
  context: RepositoryContext;
  action: string;
  tableName: string;
  recordId?: string | null;
  beforeSnapshot?: Json | null;
  afterSnapshot?: Json | null;
  metadata?: Json;
};

function defaultJsonObject(value: Json | undefined): Json {
  return value ?? {};
}

export function prepareRetrievalLog(input: RetrievalLogInput): Omit<PublicTableInsert<"retrieval_logs">, "user_id"> {
  return {
    namespace: input.context.namespace,
    query_text: input.queryText,
    filters: defaultJsonObject(input.filters),
    requested_limit: input.requestedLimit ?? null,
    returned_item_ids: input.returnedItemIds ?? [],
    metadata: defaultJsonObject(input.metadata),
  };
}

export function preparePromptLog(input: PromptLogInput): Omit<PublicTableInsert<"prompt_logs">, "user_id"> {
  return {
    namespace: input.context.namespace,
    route_name: input.routeName ?? null,
    model_name: input.modelName ?? null,
    request_hash: input.requestHash ?? null,
    response_hash: input.responseHash ?? null,
    metadata: defaultJsonObject(input.metadata),
  };
}

export function prepareAuditLog(input: AuditLogInput): Omit<PublicTableInsert<"audit_logs">, "user_id"> {
  return {
    namespace: input.context.namespace,
    action: input.action,
    table_name: input.tableName,
    record_id: input.recordId ?? null,
    before_snapshot: input.beforeSnapshot ?? null,
    after_snapshot: input.afterSnapshot ?? null,
    metadata: defaultJsonObject(input.metadata),
  };
}

export async function writeRetrievalLog(
  input: RetrievalLogInput,
  options: Pick<LoggingServiceOptions, "retrievalLogsRepository"> = {},
): Promise<RepositoryResult<RetrievalLogRow>> {
  const repository = options.retrievalLogsRepository ?? createRetrievalLogsRepository();

  return repository.create({
    context: input.context,
    tableName: "retrieval_logs",
    values: prepareRetrievalLog(input),
  });
}

export async function writePromptLog(
  input: PromptLogInput,
  options: Pick<LoggingServiceOptions, "promptLogsRepository"> = {},
): Promise<RepositoryResult<PromptLogRow>> {
  const repository = options.promptLogsRepository ?? createPromptLogsRepository();

  return repository.create({
    context: input.context,
    tableName: "prompt_logs",
    values: preparePromptLog(input),
  });
}

export async function writeAuditLog(
  input: AuditLogInput,
  options: Pick<LoggingServiceOptions, "auditLogsRepository"> = {},
): Promise<RepositoryResult<AuditLogRow>> {
  const repository = options.auditLogsRepository ?? createAuditLogsRepository();

  return repository.create({
    context: input.context,
    tableName: "audit_logs",
    values: prepareAuditLog(input),
  });
}
