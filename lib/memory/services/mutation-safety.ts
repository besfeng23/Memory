import { repositoryError, type RepositoryResult } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { buildIdempotencyContext, type IdempotencyContext, type IdempotencyScope } from "@/lib/services/idempotency";
import {
  findIdempotencyRecord,
  saveIdempotencyRecord,
  type PersistentIdempotencyOptions,
} from "@/lib/services/persistent-idempotency";
import {
  runTransactionBoundary,
  type TransactionAdapter,
} from "@/lib/services/transaction-boundary";
import {
  saveMemoryCandidate,
  type MemoryCandidateServiceInput,
  type MemoryCandidateServiceOptions,
  type PersistedMemoryCandidate,
} from "@/lib/memory/services/candidate-service";
import {
  saveMemoryPatch,
  type MemoryPatchServiceInput,
  type MemoryPatchServiceOptions,
  type PersistedMemoryPatch,
} from "@/lib/memory/services/patch-service";

export type MutationSafetyInput = {
  clientKey?: string | null;
  requestId?: string | null;
  payloadHash?: string | null;
  requestHash?: string | null;
  responseHash?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
  requireTransaction?: boolean;
};

export type MutationSafetyOptions = PersistentIdempotencyOptions & {
  transactionAdapter?: TransactionAdapter | null;
};

export type SafeMemoryCandidateInput = MemoryCandidateServiceInput & {
  safety: MutationSafetyInput;
};

export type SafeMemoryPatchInput = MemoryPatchServiceInput & {
  safety: MutationSafetyInput;
};

type MutationOperationInput = {
  context: RepositoryContext;
  scope: IdempotencyScope;
  operation: string;
  safety: MutationSafetyInput;
};

type ExistingRecordCheck = {
  idempotency: IdempotencyContext;
};

function buildMutationIdempotency(input: MutationOperationInput): RepositoryResult<IdempotencyContext> {
  return buildIdempotencyContext({
    userId: input.context.userId,
    namespace: input.context.namespace,
    scope: input.scope,
    operation: input.operation,
    clientKey: input.safety.clientKey,
    requestId: input.safety.requestId ?? input.context.requestId,
    payloadHash: input.safety.payloadHash,
  });
}

async function assertNoExistingRecord(
  context: RepositoryContext,
  idempotency: IdempotencyContext,
  options: MutationSafetyOptions,
): Promise<RepositoryResult<ExistingRecordCheck>> {
  const existingResult = await findIdempotencyRecord(context, idempotency.fingerprint, {
    repository: options.repository,
  });

  if (!existingResult.ok) {
    return existingResult;
  }

  if (existingResult.data) {
    return repositoryError("idempotency_conflict", "Idempotent mutation was already recorded.", {
      idempotencyRecordId: existingResult.data.id,
      fingerprint: existingResult.data.fingerprint,
      status: existingResult.data.status,
      operation: existingResult.data.operation,
    });
  }

  return { ok: true, data: { idempotency } };
}

async function writeOutcomeRecord(
  context: RepositoryContext,
  idempotency: IdempotencyContext,
  safety: MutationSafetyInput,
  status: "completed" | "failed",
  options: MutationSafetyOptions,
): Promise<RepositoryResult<true>> {
  const recordResult = await saveIdempotencyRecord(
    {
      context,
      idempotency,
      status,
      requestHash: safety.requestHash ?? null,
      responseHash: safety.responseHash ?? null,
      expiresAt: safety.expiresAt ?? null,
      metadata: {
        ...(safety.metadata ?? {}),
        mutation_safety: "internal_orchestrator",
      },
    },
    {
      repository: options.repository,
    },
  );

  if (!recordResult.ok) {
    return recordResult;
  }

  return { ok: true, data: true };
}

async function runSafeMutation<T>(
  input: MutationOperationInput,
  options: MutationSafetyOptions,
  mutation: () => Promise<RepositoryResult<T>>,
): Promise<RepositoryResult<T>> {
  const idempotencyResult = buildMutationIdempotency(input);
  if (!idempotencyResult.ok) {
    return idempotencyResult;
  }

  const noExistingRecord = await assertNoExistingRecord(input.context, idempotencyResult.data, options);
  if (!noExistingRecord.ok) {
    return noExistingRecord;
  }

  const mutationResult = await runTransactionBoundary(
    {
      context: {
        operationName: input.operation,
        requestId: input.context.requestId,
        idempotency: idempotencyResult.data,
      },
      adapter: options.transactionAdapter,
      requireTransaction: input.safety.requireTransaction ?? false,
    },
    mutation,
  );

  const outcomeResult = await writeOutcomeRecord(
    input.context,
    idempotencyResult.data,
    input.safety,
    mutationResult.ok ? "completed" : "failed",
    options,
  );

  if (mutationResult.ok && !outcomeResult.ok) {
    return outcomeResult;
  }

  return mutationResult;
}

export async function saveMemoryCandidateWithSafety(
  input: SafeMemoryCandidateInput,
  options: MemoryCandidateServiceOptions & MutationSafetyOptions = {},
): Promise<RepositoryResult<PersistedMemoryCandidate>> {
  return runSafeMutation(
    {
      context: input.context,
      scope: "memory_candidate",
      operation: "saveMemoryCandidate",
      safety: input.safety,
    },
    options,
    () => saveMemoryCandidate(input, options),
  );
}

export async function saveMemoryPatchWithSafety(
  input: SafeMemoryPatchInput,
  options: MemoryPatchServiceOptions & MutationSafetyOptions = {},
): Promise<RepositoryResult<PersistedMemoryPatch>> {
  return runSafeMutation(
    {
      context: input.context,
      scope: "memory_patch",
      operation: "saveMemoryPatch",
      safety: input.safety,
    },
    options,
    () => saveMemoryPatch(input, options),
  );
}
