import type { IdempotencyRecordRow, Json, PublicTableInsert } from "@/lib/supabase/database.types";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { createIdempotencyRecordsRepository } from "@/lib/db/core-repositories";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { IdempotencyContext } from "@/lib/services/idempotency";

export type IdempotencyRecordStatus = "started" | "completed" | "failed";

export type PersistentIdempotencyInput = {
  context: RepositoryContext;
  idempotency: IdempotencyContext;
  status?: IdempotencyRecordStatus;
  requestHash?: string | null;
  responseHash?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type PersistentIdempotencyOptions = {
  repository?: ReturnType<typeof createIdempotencyRecordsRepository>;
};

type PreparedIdempotencyRecord = Omit<PublicTableInsert<"idempotency_records">, "user_id">;

function toJson(value: Record<string, unknown>): Json {
  return value as Json;
}

function assertContextMatchesIdempotency(input: PersistentIdempotencyInput): RepositoryResult<true> {
  if (input.context.userId !== input.idempotency.userId) {
    return repositoryError("validation_failed", "Idempotency user does not match repository context.", {
      contextUserId: input.context.userId,
      idempotencyUserId: input.idempotency.userId,
    });
  }

  if (input.context.namespace !== input.idempotency.namespace) {
    return repositoryError("namespace_mismatch", "Idempotency namespace does not match repository context.", {
      contextNamespace: input.context.namespace,
      idempotencyNamespace: input.idempotency.namespace,
    });
  }

  return repositoryOk(true);
}

export function prepareIdempotencyRecord(input: PersistentIdempotencyInput): RepositoryResult<PreparedIdempotencyRecord> {
  const contextCheck = assertContextMatchesIdempotency(input);
  if (!contextCheck.ok) {
    return contextCheck;
  }

  return repositoryOk({
    namespace: input.context.namespace,
    scope: input.idempotency.scope,
    operation: input.idempotency.operation,
    idempotency_key: input.idempotency.key,
    key_source: input.idempotency.keySource,
    fingerprint: input.idempotency.fingerprint,
    request_hash: input.requestHash ?? null,
    response_hash: input.responseHash ?? null,
    status: input.status ?? "started",
    expires_at: input.expiresAt ?? null,
    metadata: toJson(input.metadata ?? {}),
    updated_at: new Date().toISOString(),
  });
}

export async function saveIdempotencyRecord(
  input: PersistentIdempotencyInput,
  options: PersistentIdempotencyOptions = {},
): Promise<RepositoryResult<IdempotencyRecordRow>> {
  const prepared = prepareIdempotencyRecord(input);
  if (!prepared.ok) {
    return prepared;
  }

  const repository = options.repository ?? createIdempotencyRecordsRepository();
  return repository.create({
    context: input.context,
    tableName: "idempotency_records",
    values: prepared.data,
  });
}

export async function findIdempotencyRecord(
  context: RepositoryContext,
  fingerprint: string,
  options: PersistentIdempotencyOptions = {},
): Promise<RepositoryResult<IdempotencyRecordRow | null>> {
  const normalizedFingerprint = fingerprint.trim();

  if (!normalizedFingerprint) {
    return repositoryError("validation_failed", "Idempotency fingerprint is required.");
  }

  const repository = options.repository ?? createIdempotencyRecordsRepository();
  const listResult = await repository.list({
    context,
    tableName: "idempotency_records",
    limit: 100,
  });

  if (!listResult.ok) {
    return listResult;
  }

  return repositoryOk(listResult.data.find((record) => record.fingerprint === normalizedFingerprint) ?? null);
}
