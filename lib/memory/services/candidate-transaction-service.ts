import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { createMemoryItemsRepository, createMemorySourcesRepository } from "@/lib/db/core-repositories";
import { buildIdempotencyContext } from "@/lib/services/idempotency";
import type { IdempotencyRpcClient, IdempotencyRpcError } from "@/lib/services/idempotency-rpc";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, MemoryItemRow, MemorySourceRow } from "@/lib/supabase/database.types";
import {
  prepareMemoryCandidate,
  type MemoryCandidateServiceInput,
  type PreparedMemoryCandidate,
  type PersistedMemoryCandidate,
} from "@/lib/memory/services/candidate-service";

export type MemoryCandidateTransactionSafety = {
  clientKey?: string | null;
  requestId?: string | null;
  payloadHash?: string | null;
  requestHash?: string | null;
  responseHash?: string | null;
  expiresAt?: string | null;
};

export type MemoryCandidateTransactionInput = MemoryCandidateServiceInput & {
  safety: MemoryCandidateTransactionSafety;
};

export type MemoryCandidateTransactionResult = PersistedMemoryCandidate & {
  idempotencyRecordId: string;
};

type CandidateTransactionRpcRow = {
  memory_item_id: string | null;
  source_ids: string[];
  idempotency_record_id: string;
  was_claimed: boolean;
  existing_status: string | null;
};

type CandidateTransactionRpcArgs = Record<string, unknown>;

type CandidateTransactionCall = {
  args: CandidateTransactionRpcArgs;
  prepared: PreparedMemoryCandidate;
  timestamp: string;
};

export type CandidateTransactionOptions = {
  createClient?: () => Promise<IdempotencyRpcClient>;
  now?: () => string;
  readBack?: boolean;
  memoryItemsRepository?: ReturnType<typeof createMemoryItemsRepository>;
  memorySourcesRepository?: ReturnType<typeof createMemorySourcesRepository>;
};

function defaultNow() {
  return new Date().toISOString();
}

function toJson(value: unknown): Json {
  return value as Json;
}

function errorDetails(error: IdempotencyRpcError): Record<string, unknown> {
  return {
    code: error.code,
    details: error.details,
    hint: error.hint,
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTransactionRow(value: unknown): value is CandidateTransactionRpcRow {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    (typeof value.memory_item_id === "string" || value.memory_item_id === null) &&
    Array.isArray(value.source_ids) &&
    value.source_ids.every((id) => typeof id === "string") &&
    typeof value.idempotency_record_id === "string" &&
    typeof value.was_claimed === "boolean"
  );
}

function firstTransactionRow(value: unknown): CandidateTransactionRpcRow | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const row = value[0];
  return isTransactionRow(row) ? row : null;
}

async function createDefaultClient(): Promise<IdempotencyRpcClient> {
  return (await createSupabaseServerClient()) as unknown as IdempotencyRpcClient;
}

function buildSources(input: PreparedMemoryCandidate) {
  return input.sources.map((source) => ({
    source_type: source.source_type,
    source_ref: source.source_ref,
    excerpt: source.excerpt,
    confidence: source.confidence,
    metadata: source.metadata,
  }));
}

function buildRpcCall(
  context: RepositoryContext,
  input: MemoryCandidateTransactionInput,
  options: Pick<CandidateTransactionOptions, "now"> = {},
): RepositoryResult<CandidateTransactionCall> {
  const timestamp = (options.now ?? defaultNow)();
  const prepared = prepareMemoryCandidate(input, { now: () => timestamp });
  if (!prepared.ok) {
    return prepared;
  }

  const idempotency = buildIdempotencyContext({
    userId: context.userId,
    namespace: context.namespace,
    scope: "memory_candidate",
    operation: "saveMemoryCandidateTransaction",
    clientKey: input.safety.clientKey,
    requestId: input.safety.requestId ?? context.requestId,
    payloadHash: input.safety.payloadHash,
  });

  if (!idempotency.ok) {
    return idempotency;
  }

  return repositoryOk({
    prepared: prepared.data,
    timestamp,
    args: {
      p_namespace: context.namespace,
      p_memory_type: prepared.data.memoryItem.memory_type,
      p_title: prepared.data.memoryItem.title,
      p_body: prepared.data.memoryItem.body,
      p_strength: prepared.data.memoryItem.strength,
      p_confidence: prepared.data.memoryItem.confidence,
      p_canon_status: prepared.data.memoryItem.canon_status,
      p_source_summary: prepared.data.memoryItem.source_summary,
      p_metadata: toJson(prepared.data.memoryItem.metadata),
      p_sources: toJson(buildSources(prepared.data)),
      p_scope: idempotency.data.scope,
      p_operation: idempotency.data.operation,
      p_idempotency_key: idempotency.data.key,
      p_key_source: idempotency.data.keySource,
      p_fingerprint: idempotency.data.fingerprint,
      p_request_hash: input.safety.requestHash ?? null,
      p_response_hash: input.safety.responseHash ?? null,
      p_expires_at: input.safety.expiresAt ?? null,
    },
  });
}

function validateReturnedIds(
  row: CandidateTransactionRpcRow,
  prepared: PreparedMemoryCandidate,
): RepositoryResult<{ memoryItemId: string; sourceIds: string[] }> {
  if (!row.memory_item_id) {
    return repositoryError("database_error", "Memory candidate transaction did not return a memory item id.");
  }

  if (row.source_ids.length !== prepared.sources.length) {
    return repositoryError("database_error", "Memory candidate transaction returned unexpected source count.", {
      expected: prepared.sources.length,
      actual: row.source_ids.length,
    });
  }

  return repositoryOk({ memoryItemId: row.memory_item_id, sourceIds: row.source_ids });
}

function buildPersistedResult(
  context: RepositoryContext,
  call: CandidateTransactionCall,
  row: CandidateTransactionRpcRow,
): RepositoryResult<MemoryCandidateTransactionResult> {
  const ids = validateReturnedIds(row, call.prepared);
  if (!ids.ok) {
    return ids;
  }

  const memoryItem: MemoryItemRow = {
    id: ids.data.memoryItemId,
    user_id: context.userId,
    namespace: call.prepared.memoryItem.namespace,
    memory_type: call.prepared.memoryItem.memory_type,
    title: call.prepared.memoryItem.title,
    body: call.prepared.memoryItem.body,
    strength: call.prepared.memoryItem.strength,
    confidence: call.prepared.memoryItem.confidence,
    canon_status: call.prepared.memoryItem.canon_status,
    source_summary: call.prepared.memoryItem.source_summary,
    metadata: call.prepared.memoryItem.metadata,
    is_active: call.prepared.memoryItem.is_active,
    created_at: call.timestamp,
    updated_at: call.prepared.memoryItem.updated_at,
  };

  const sources: MemorySourceRow[] = call.prepared.sources.map((source, index) => ({
    id: ids.data.sourceIds[index],
    user_id: context.userId,
    namespace: call.prepared.candidate.namespace,
    memory_item_id: ids.data.memoryItemId,
    source_type: source.source_type,
    source_ref: source.source_ref,
    excerpt: source.excerpt,
    confidence: source.confidence,
    metadata: source.metadata,
    created_at: call.timestamp,
  }));

  return repositoryOk({
    memoryItem,
    sources,
    warnings: call.prepared.warnings,
    idempotencyRecordId: row.idempotency_record_id,
  });
}

async function readBackPersistedResult(
  context: RepositoryContext,
  call: CandidateTransactionCall,
  row: CandidateTransactionRpcRow,
  options: CandidateTransactionOptions,
): Promise<RepositoryResult<MemoryCandidateTransactionResult>> {
  const ids = validateReturnedIds(row, call.prepared);
  if (!ids.ok) {
    return ids;
  }

  const memoryItemsRepository = options.memoryItemsRepository ?? createMemoryItemsRepository();
  const memorySourcesRepository = options.memorySourcesRepository ?? createMemorySourcesRepository();

  const memoryItem = await memoryItemsRepository.getById({
    context,
    tableName: "memory_items",
    id: ids.data.memoryItemId,
  });

  if (!memoryItem.ok) {
    return memoryItem;
  }

  const sources: MemorySourceRow[] = [];
  for (const sourceId of ids.data.sourceIds) {
    const source = await memorySourcesRepository.getById({
      context,
      tableName: "memory_sources",
      id: sourceId,
    });

    if (!source.ok) {
      return source;
    }

    sources.push(source.data);
  }

  return repositoryOk({
    memoryItem: memoryItem.data,
    sources,
    warnings: call.prepared.warnings,
    idempotencyRecordId: row.idempotency_record_id,
  });
}

export async function saveMemoryCandidateTransaction(
  input: MemoryCandidateTransactionInput,
  options: CandidateTransactionOptions = {},
): Promise<RepositoryResult<MemoryCandidateTransactionResult>> {
  const call = buildRpcCall(input.context, input, { now: options.now });
  if (!call.ok) {
    return call;
  }

  const client = await (options.createClient ?? createDefaultClient)();
  const result = await client.rpc("save_validated_memory_candidate_transaction", call.data.args);

  if (result.error) {
    return repositoryError("database_error", result.error.message ?? "Memory candidate transaction failed.", errorDetails(result.error));
  }

  const row = firstTransactionRow(result.data);
  if (!row) {
    return repositoryError("database_error", "Memory candidate transaction returned no valid row.");
  }

  if (!row.was_claimed) {
    return repositoryError("idempotency_conflict", "Memory candidate transaction was already claimed.", {
      idempotencyRecordId: row.idempotency_record_id,
      status: row.existing_status,
    });
  }

  if (options.readBack) {
    return readBackPersistedResult(input.context, call.data, row, options);
  }

  return buildPersistedResult(input.context, call.data, row);
}
