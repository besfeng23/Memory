import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { buildIdempotencyContext } from "@/lib/services/idempotency";
import type { IdempotencyRpcClient, IdempotencyRpcError } from "@/lib/services/idempotency-rpc";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { prepareMemoryCandidate, type MemoryCandidateServiceInput } from "@/lib/memory/services/candidate-service";

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

export type MemoryCandidateTransactionResult = {
  memoryItemId: string;
  sourceIds: string[];
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

export type CandidateTransactionOptions = {
  createClient?: () => Promise<IdempotencyRpcClient>;
};

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

function buildSources(input: ReturnType<typeof prepareMemoryCandidate> extends RepositoryResult<infer T> ? T : never) {
  return input.sources.map((source) => ({
    source_type: source.source_type,
    source_ref: source.source_ref,
    excerpt: source.excerpt,
    confidence: source.confidence,
    metadata: source.metadata,
  }));
}

function buildRpcArgs(
  context: RepositoryContext,
  input: MemoryCandidateTransactionInput,
): RepositoryResult<CandidateTransactionRpcArgs> {
  const prepared = prepareMemoryCandidate(input);
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
  });
}

export async function saveMemoryCandidateTransaction(
  input: MemoryCandidateTransactionInput,
  options: CandidateTransactionOptions = {},
): Promise<RepositoryResult<MemoryCandidateTransactionResult>> {
  const args = buildRpcArgs(input.context, input);
  if (!args.ok) {
    return args;
  }

  const client = await (options.createClient ?? createDefaultClient)();
  const result = await client.rpc("save_validated_memory_candidate_transaction", args.data);

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

  if (!row.memory_item_id) {
    return repositoryError("database_error", "Memory candidate transaction did not return a memory item id.");
  }

  return repositoryOk({
    memoryItemId: row.memory_item_id,
    sourceIds: row.source_ids,
    idempotencyRecordId: row.idempotency_record_id,
  });
}
