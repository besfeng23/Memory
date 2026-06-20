import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type {
  MemoryIngestPlannedOperation,
  MemoryIngestPlannedOperationName,
  MemoryIngestWritePlan,
} from "@/lib/services/memory-ingest-write-plan-builder";
import type { PandoraNamespace } from "@/lib/supabase/database.types";

export type MemoryIngestExecutedOperation = {
  operation: MemoryIngestPlannedOperationName;
  target: MemoryIngestPlannedOperation["target"];
  mode: "dry_run_execute_only";
  appendOnly: true;
  writesNow: false;
  order: number;
};

export type MemoryIngestBlockedOperation = {
  operation: string;
  target: string;
  order: number;
  blockers: string[];
};

export type MemoryIngestWritePlanExecutionReport = {
  status: "executed_dry_run" | "blocked";
  namespace: PandoraNamespace;
  userId: string;
  executedOperations: MemoryIngestExecutedOperation[];
  blockedOperations: MemoryIngestBlockedOperation[];
  wouldPersist: false;
  writesPerformed: false;
  wouldCallModel: false;
  wouldPerformRetrieval: false;
  appendOnly: true;
  usesClientUserId: false;
  warnings: string[];
  blockers: string[];
  requestHash: string | null;
  fingerprint: string | null;
};

export type MemoryIngestWritePlanExecutorInput = {
  context: RepositoryContext;
  request: FutureMemoryIngestRequest;
  writePlan: MemoryIngestWritePlan;
  requestHash?: string | null;
  fingerprint?: string | null;
};

const EXPECTED_OPERATION_ORDER: MemoryIngestPlannedOperationName[] = [
  "validate_namespace_boundary",
  "insert_memory_source",
  "insert_memory_item",
  "insert_memory_patch",
  "insert_audit_log",
  "finalize_idempotency_record",
];

function hasClientSuppliedUserId(request: FutureMemoryIngestRequest): boolean {
  return Object.prototype.hasOwnProperty.call(request.metadata, "user_id") || Object.prototype.hasOwnProperty.call(request.metadata, "userId");
}

function validateOperationSequence(operations: MemoryIngestWritePlan["plannedOperations"]): {
  blockers: string[];
  blockedOperations: MemoryIngestBlockedOperation[];
} {
  const blockers: string[] = [];
  const blockedOperations: MemoryIngestBlockedOperation[] = [];

  if (operations.length !== EXPECTED_OPERATION_ORDER.length) blockers.push("operation_sequence_missing_or_extra_operations");

  operations.forEach((operation, index) => {
    const operationBlockers: string[] = [];
    const expectedOperation = EXPECTED_OPERATION_ORDER[index];

    if (!EXPECTED_OPERATION_ORDER.includes(operation.operation)) operationBlockers.push("unknown_operation");
    if (operation.operation !== expectedOperation) operationBlockers.push("operation_out_of_order");
    if (operation.writesNow) operationBlockers.push("planned_operation_writes_now");
    if (!operation.appendOnly) operationBlockers.push("planned_operation_not_append_only");

    if (operationBlockers.length > 0) {
      blockedOperations.push({
        operation: operation.operation,
        target: operation.target,
        order: index + 1,
        blockers: operationBlockers,
      });
    }
  });

  for (const expectedOperation of EXPECTED_OPERATION_ORDER) {
    if (!operations.some((operation) => operation.operation === expectedOperation)) blockers.push(`missing_operation:${expectedOperation}`);
  }

  if (blockedOperations.some((operation) => operation.blockers.includes("unknown_operation"))) blockers.push("unknown_operation");
  if (blockedOperations.some((operation) => operation.blockers.includes("operation_out_of_order"))) blockers.push("operation_out_of_order");
  if (blockedOperations.some((operation) => operation.blockers.includes("planned_operation_writes_now"))) blockers.push("planned_operation_writes_now");
  if (blockedOperations.some((operation) => operation.blockers.includes("planned_operation_not_append_only"))) blockers.push("planned_operation_not_append_only");

  return { blockers: Array.from(new Set(blockers)), blockedOperations };
}

export function executeMemoryIngestWritePlanDryRun(input: MemoryIngestWritePlanExecutorInput): RepositoryResult<MemoryIngestWritePlanExecutionReport> {
  const blockers: string[] = [];
  const warnings = [...input.writePlan.warnings];

  if (!input.context.userId.trim()) blockers.push("missing_authenticated_user");
  if (input.context.namespace !== input.request.namespace) blockers.push("context_request_namespace_mismatch");
  if (input.writePlan.namespace !== input.request.namespace) blockers.push("plan_request_namespace_mismatch");
  if (input.writePlan.userId !== input.context.userId) blockers.push("plan_user_mismatch");
  if (input.writePlan.status !== "planned") blockers.push("write_plan_not_planned");
  if (input.writePlan.wouldPersist) blockers.push("write_plan_would_persist");
  if (input.writePlan.usesClientUserId || hasClientSuppliedUserId(input.request)) blockers.push("client_user_id_override_attempt");

  const sequenceValidation = validateOperationSequence(input.writePlan.plannedOperations);
  blockers.push(...sequenceValidation.blockers);

  const uniqueBlockers = Array.from(new Set(blockers));
  const isBlocked = uniqueBlockers.length > 0;

  return repositoryOk({
    status: isBlocked ? "blocked" : "executed_dry_run",
    namespace: input.request.namespace,
    userId: input.context.userId,
    executedOperations: isBlocked
      ? []
      : input.writePlan.plannedOperations.map((operation, index) => ({
          operation: operation.operation,
          target: operation.target,
          mode: "dry_run_execute_only",
          appendOnly: true,
          writesNow: false,
          order: index + 1,
        })),
    blockedOperations: sequenceValidation.blockedOperations,
    wouldPersist: false,
    writesPerformed: false,
    wouldCallModel: false,
    wouldPerformRetrieval: false,
    appendOnly: true,
    usesClientUserId: false,
    warnings,
    blockers: uniqueBlockers,
    requestHash: input.requestHash ?? input.writePlan.requestHash ?? null,
    fingerprint: input.fingerprint ?? input.writePlan.fingerprint ?? null,
  });
}
