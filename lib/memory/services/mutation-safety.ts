import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { buildIdempotencyContext, type IdempotencyContext, type IdempotencyScope } from "@/lib/services/idempotency";
import {
  findIdempotencyRecord,
  saveIdempotencyRecord,
  type PersistentIdempotencyOptions,
} from "@/lib/services/persistent-idempotency";
import {
  claimIdempotencyRecord,
  finishIdempotencyRecord,
  type IdempotencyRpcOptions,
} from "@/lib/services/idempotency-rpc";
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
  saveMemoryCandidateTransaction,
  type CandidateTransactionOptions,
} from "@/lib/memory/services/candidate-transaction-service";
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

export type MutationSafetyStrategy = "repository" | "rpc" | "candidate_transaction_rpc";

export type MutationSafetyOptions = PersistentIdempotencyOptions & IdempotencyRpcOptions & CandidateTransactionOptions & {
  transactionAdapter?: TransactionAdapter | null;
  idempotencyStrategy?: MutationSafetyStrategy;
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

type RpcClaimCheck = {
  idempotency: IdempotencyContext;
  recordId: string;
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

async function claimRpcRecord(
  context: RepositoryContext,
  idempotency: IdempotencyContext,
  safety: MutationSafetyInput,
  options: MutationSafetyOptions,
): Promise<RepositoryResult<RpcClaimCheck>> {
  const claimResult = await claimIdempotencyRecord(
    {
      context,
      idempotency,
      requestHash: safety.requestHash ?? null,
      expiresAt: safety.expiresAt ?? null,
      metadata: {
        ...(safety.metadata ?? {}),
        mutation_safety: "rpc_claim",
      },
    },
    {
      createClient: options.createClient,
    },
  );

  if (!claimResult.ok) {
    return claimResult;
  }

  if (!claimResult.data.wasClaimed) {
    return repositoryError("idempotency_conflict", "Idempotent mutation was already claimed.", {
      idempotencyRecordId: claimResult.data.recordId,
      fingerprint: idempotency.fingerprint,
      status: claimResult.data.existingStatus,
      operation: idempotency.operation,
    });
  }

  return { ok: true, data: { idempotency, recordId: claimResult.data.recordId } };
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

async function finishRpcRecord(
  context: RepositoryContext,
  idempotency: IdempotencyContext,
  recordId: string,
  safety: MutationSafetyInput,
  status: "completed" | "failed",
  options: MutationSafetyOptions,
): Promise<RepositoryResult<true>> {
  const finishResult = await finishIdempotencyRecord(
    {
      context,
      idempotency,
      recordId,
      status,
      responseHash: safety.responseHash ?? null,
      metadata: {
        ...(safety.metadata ?? {}),
        mutation_safety: "rpc_finish",
      },
    },
    {
      createClient: options.createClient,
    },
  );

  if (!finishResult.ok) {
    return finishResult;
  }

  return { ok: true, data: true };
}

async function runMutationWithBoundary<T>(
  input: MutationOperationInput,
  idempotency: IdempotencyContext,
  options: MutationSafetyOptions,
  mutation: () => Promise<RepositoryResult<T>>,
): Promise<RepositoryResult<T>> {
  return runTransactionBoundary(
    {
      context: {
        operationName: input.operation,
        requestId: input.context.requestId,
        idempotency,
      },
      adapter: options.transactionAdapter,
      requireTransaction: input.safety.requireTransaction ?? false,
    },
    mutation,
  );
}

async function runRepositoryBackedMutation<T>(
  input: MutationOperationInput,
  idempotency: IdempotencyContext,
  options: MutationSafetyOptions,
  mutation: () => Promise<RepositoryResult<T>>,
): Promise<RepositoryResult<T>> {
  const noExistingRecord = await assertNoExistingRecord(input.context, idempotency, options);
  if (!noExistingRecord.ok) {
    return noExistingRecord;
  }

  const mutationResult = await runMutationWithBoundary(input, idempotency, options, mutation);
  const outcomeResult = await writeOutcomeRecord(
    input.context,
    idempotency,
    input.safety,
    mutationResult.ok ? "completed" : "failed",
    options,
  );

  if (mutationResult.ok && !outcomeResult.ok) {
    return outcomeResult;
  }

  return mutationResult;
}

async function runRpcBackedMutation<T>(
  input: MutationOperationInput,
  idempotency: IdempotencyContext,
  options: MutationSafetyOptions,
  mutation: () => Promise<RepositoryResult<T>>,
): Promise<RepositoryResult<T>> {
  const claimResult = await claimRpcRecord(input.context, idempotency, input.safety, options);
  if (!claimResult.ok) {
    return claimResult;
  }

  const mutationResult = await runMutationWithBoundary(input, idempotency, options, mutation);
  const finishResult = await finishRpcRecord(
    input.context,
    idempotency,
    claimResult.data.recordId,
    input.safety,
    mutationResult.ok ? "completed" : "failed",
    options,
  );

  if (mutationResult.ok && !finishResult.ok) {
    return finishResult;
  }

  return mutationResult;
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

  if (options.idempotencyStrategy === "rpc") {
    return runRpcBackedMutation(input, idempotencyResult.data, options, mutation);
  }

  return runRepositoryBackedMutation(input, idempotencyResult.data, options, mutation);
}

function transactionResultToPersistedCandidate(result: {
  memoryItemId: string;
  sourceIds: string[];
  idempotencyRecordId: string;
}): PersistedMemoryCandidate {
  return {
    memoryItem: {
      id: result.memoryItemId,
      user_id: "",
      namespace: "real_life",
      memory_type: "observation",
      title: "transaction-rpc-result",
      body: "transaction-rpc-result",
      strength: "medium",
      confidence: 1,
      canon_status: "draft",
      source_summary: null,
      metadata: { idempotencyRecordId: result.idempotencyRecordId },
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    sources: result.sourceIds.map((id) => ({
      id,
      user_id: "",
      namespace: "real_life",
      memory_item_id: result.memoryItemId,
      source_type: "user_statement",
      source_ref: null,
      excerpt: null,
      confidence: 1,
      metadata: {},
      created_at: "",
    })),
    warnings: [],
  };
}

export async function saveMemoryCandidateWithSafety(
  input: SafeMemoryCandidateInput,
  options: MemoryCandidateServiceOptions & MutationSafetyOptions = {},
): Promise<RepositoryResult<PersistedMemoryCandidate>> {
  if (options.idempotencyStrategy === "candidate_transaction_rpc") {
    const result = await saveMemoryCandidateTransaction(input, {
      createClient: options.createClient,
    });

    if (!result.ok) {
      return result;
    }

    return repositoryOk(transactionResultToPersistedCandidate(result.data));
  }

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
