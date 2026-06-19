import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ClaimIdempotencyRecordArgs,
  ClaimIdempotencyRecordRow,
  FinishIdempotencyRecordArgs,
  FinishIdempotencyRecordRow,
  Json,
} from "@/lib/supabase/database.types";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { IdempotencyContext } from "@/lib/services/idempotency";

export type IdempotencyRpcError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export type IdempotencyRpcResult<T> = Promise<{
  data: T | null;
  error: IdempotencyRpcError | null;
}>;

export type IdempotencyRpcClient = {
  rpc(functionName: "claim_idempotency_record", args: ClaimIdempotencyRecordArgs): IdempotencyRpcResult<ClaimIdempotencyRecordRow[]>;
  rpc(functionName: "finish_idempotency_record", args: FinishIdempotencyRecordArgs): IdempotencyRpcResult<FinishIdempotencyRecordRow[]>;
};

export type IdempotencyClaimInput = {
  context: RepositoryContext;
  idempotency: IdempotencyContext;
  requestHash?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type IdempotencyFinishInput = {
  context: RepositoryContext;
  idempotency: IdempotencyContext;
  recordId: string;
  status: "completed" | "failed";
  responseHash?: string | null;
  metadata?: Record<string, unknown>;
};

export type IdempotencyClaimResult = {
  recordId: string;
  wasClaimed: boolean;
  existingStatus: string | null;
};

export type IdempotencyFinishResult = {
  recordId: string;
  finalStatus: "completed" | "failed";
};

export type IdempotencyRpcOptions = {
  createClient?: () => Promise<IdempotencyRpcClient>;
};

function toJson(value: Record<string, unknown>): Json {
  return value as Json;
}

function errorDetails(error: IdempotencyRpcError): Record<string, unknown> {
  return {
    code: error.code,
    details: error.details,
    hint: error.hint,
  };
}

function assertContextMatchesIdempotency(context: RepositoryContext, idempotency: IdempotencyContext): RepositoryResult<true> {
  if (context.userId !== idempotency.userId) {
    return repositoryError("validation_failed", "Idempotency user does not match repository context.", {
      contextUserId: context.userId,
      idempotencyUserId: idempotency.userId,
    });
  }

  if (context.namespace !== idempotency.namespace) {
    return repositoryError("namespace_mismatch", "Idempotency namespace does not match repository context.", {
      contextNamespace: context.namespace,
      idempotencyNamespace: idempotency.namespace,
    });
  }

  return repositoryOk(true);
}

async function createDefaultRpcClient(): Promise<IdempotencyRpcClient> {
  return (await createSupabaseServerClient()) as IdempotencyRpcClient;
}

export async function claimIdempotencyRecord(
  input: IdempotencyClaimInput,
  options: IdempotencyRpcOptions = {},
): Promise<RepositoryResult<IdempotencyClaimResult>> {
  const contextCheck = assertContextMatchesIdempotency(input.context, input.idempotency);
  if (!contextCheck.ok) {
    return contextCheck;
  }

  const client = await (options.createClient ?? createDefaultRpcClient)();
  const result = await client.rpc("claim_idempotency_record", {
    p_namespace: input.context.namespace,
    p_scope: input.idempotency.scope,
    p_operation: input.idempotency.operation,
    p_idempotency_key: input.idempotency.key,
    p_key_source: input.idempotency.keySource,
    p_fingerprint: input.idempotency.fingerprint,
    p_request_hash: input.requestHash ?? null,
    p_expires_at: input.expiresAt ?? null,
    p_metadata: toJson(input.metadata ?? {}),
  });

  if (result.error) {
    return repositoryError("database_error", result.error.message ?? "Idempotency claim failed.", errorDetails(result.error));
  }

  const row = result.data?.[0];
  if (!row) {
    return repositoryError("database_error", "Idempotency claim returned no row.");
  }

  return repositoryOk({
    recordId: row.record_id,
    wasClaimed: row.was_claimed,
    existingStatus: row.existing_status,
  });
}

export async function finishIdempotencyRecord(
  input: IdempotencyFinishInput,
  options: IdempotencyRpcOptions = {},
): Promise<RepositoryResult<IdempotencyFinishResult>> {
  const contextCheck = assertContextMatchesIdempotency(input.context, input.idempotency);
  if (!contextCheck.ok) {
    return contextCheck;
  }

  const client = await (options.createClient ?? createDefaultRpcClient)();
  const result = await client.rpc("finish_idempotency_record", {
    p_record_id: input.recordId,
    p_namespace: input.context.namespace,
    p_fingerprint: input.idempotency.fingerprint,
    p_status: input.status,
    p_response_hash: input.responseHash ?? null,
    p_metadata: toJson(input.metadata ?? {}),
  });

  if (result.error) {
    return repositoryError("database_error", result.error.message ?? "Idempotency finish failed.", errorDetails(result.error));
  }

  const row = result.data?.[0];
  if (!row) {
    return repositoryError("database_error", "Idempotency finish returned no row.");
  }

  return repositoryOk({
    recordId: row.record_id,
    finalStatus: row.final_status,
  });
}
