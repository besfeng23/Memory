import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { MemoryIngestPersistenceRepository } from "@/lib/db/memory-ingest-persistence-contract";
import { validateMemoryIngestTransactionPlan, type MemoryIngestTransactionPlanValidation } from "@/lib/db/memory-ingest-transaction-contract";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryIngestInternalWriteModeEnv } from "@/lib/services/memory-ingest-internal-write-mode";
import { getMemoryIngestInternalWriteModeState, type MemoryIngestInternalWriteModeState } from "@/lib/services/memory-ingest-internal-write-mode";
import { executeMemoryIngestPersistencePlan, type MemoryIngestPersistenceExecutionResult } from "@/lib/services/memory-ingest-persistence-executor";
import { runMemoryIngestPersistencePreflight, type MemoryIngestPersistencePreflightResult } from "@/lib/services/memory-ingest-persistence-preflight";
import { buildMemoryIngestWritePlan, type MemoryIngestWritePlan } from "@/lib/services/memory-ingest-write-plan-builder";
import type { PandoraNamespace } from "@/lib/supabase/database.types";

export type MemoryIngestInternalWriteHarnessInput = {
  context: RepositoryContext;
  request: FutureMemoryIngestRequest;
  repository: MemoryIngestPersistenceRepository;
  env: MemoryIngestInternalWriteModeEnv;
  options?: {
    transactionOperationsOverride?: Parameters<typeof validateMemoryIngestTransactionPlan>[0]["operations"];
  };
  requestHash?: string | null;
  fingerprint?: string | null;
};

export type MemoryIngestInternalWriteHarnessResult = {
  status: "completed_test_only" | "blocked";
  namespace: PandoraNamespace;
  userId: string;
  mode: MemoryIngestInternalWriteModeState;
  preflight: MemoryIngestPersistencePreflightResult | null;
  writePlan: MemoryIngestWritePlan | null;
  transactionValidation: MemoryIngestTransactionPlanValidation | null;
  execution: MemoryIngestPersistenceExecutionResult | null;
  warnings: string[];
  blockers: string[];
};

function block(input: MemoryIngestInternalWriteHarnessInput, partial: Partial<MemoryIngestInternalWriteHarnessResult>): MemoryIngestInternalWriteHarnessResult {
  return {
    status: "blocked",
    namespace: input.context.namespace,
    userId: input.context.userId,
    mode: partial.mode ?? getMemoryIngestInternalWriteModeState(input.env),
    preflight: partial.preflight ?? null,
    writePlan: partial.writePlan ?? null,
    transactionValidation: partial.transactionValidation ?? null,
    execution: partial.execution ?? null,
    warnings: partial.warnings ?? [],
    blockers: Array.from(new Set(partial.blockers ?? [])),
  };
}

export async function runMemoryIngestInternalWriteHarness(input: MemoryIngestInternalWriteHarnessInput): Promise<MemoryIngestInternalWriteHarnessResult> {
  const mode = getMemoryIngestInternalWriteModeState(input.env);
  if (!mode.enabled) {
    return block(input, { mode, warnings: mode.warnings, blockers: mode.blockers });
  }

  const preflightResult = await runMemoryIngestPersistencePreflight({
    context: input.context,
    request: input.request,
    requestHash: input.requestHash,
    fingerprint: input.fingerprint,
  });
  if (!preflightResult.ok) return block(input, { mode, warnings: mode.warnings, blockers: [preflightResult.error.code] });
  const preflight = preflightResult.data;
  if (preflight.status !== "ready") return block(input, { mode, preflight, warnings: [...mode.warnings, ...preflight.warnings], blockers: preflight.blockers });

  const writePlanResult = buildMemoryIngestWritePlan({
    context: input.context,
    request: input.request,
    preflight,
    requestHash: input.requestHash,
    fingerprint: input.fingerprint,
  });
  if (!writePlanResult.ok) return block(input, { mode, preflight, warnings: [...mode.warnings, ...preflight.warnings], blockers: [writePlanResult.error.code] });
  const writePlan = writePlanResult.data;
  if (writePlan.status !== "planned") {
    return block(input, { mode, preflight, writePlan, warnings: [...mode.warnings, ...writePlan.warnings], blockers: writePlan.blockers });
  }

  const transactionResult = validateMemoryIngestTransactionPlan({
    namespace: input.context.namespace,
    operations: input.options?.transactionOperationsOverride ?? writePlan.plannedOperations.map((operation) => ({
      operation: operation.operation,
      target: operation.target,
      namespace: input.context.namespace,
      appendOnly: operation.appendOnly,
      writesNow: operation.writesNow,
    })),
  });
  if (!transactionResult.ok) return block(input, { mode, preflight, writePlan, warnings: [...mode.warnings, ...writePlan.warnings], blockers: [transactionResult.error.code] });
  const transactionValidation = transactionResult.data;
  if (transactionValidation.status !== "valid") {
    return block(input, { mode, preflight, writePlan, transactionValidation, warnings: [...mode.warnings, ...writePlan.warnings], blockers: transactionValidation.blockers });
  }

  const executionResult = await executeMemoryIngestPersistencePlan({
    enabled: mode.enabled,
    context: input.context,
    request: input.request,
    writePlan,
    repository: input.repository,
    requestHash: input.requestHash,
    fingerprint: input.fingerprint,
  });
  if (!executionResult.ok) {
    return block(input, { mode, preflight, writePlan, transactionValidation, warnings: [...mode.warnings, ...writePlan.warnings], blockers: [executionResult.error.code] });
  }
  const execution = executionResult.data;
  if (execution.status !== "persisted") {
    return block(input, { mode, preflight, writePlan, transactionValidation, execution, warnings: [...mode.warnings, ...writePlan.warnings], blockers: execution.blockers });
  }

  return {
    status: "completed_test_only",
    namespace: input.context.namespace,
    userId: input.context.userId,
    mode,
    preflight,
    writePlan,
    transactionValidation,
    execution,
    warnings: [...mode.warnings, ...writePlan.warnings],
    blockers: [],
  };
}
