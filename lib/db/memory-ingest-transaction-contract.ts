import { repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { PandoraNamespace } from "@/lib/supabase/database.types";

export type MemoryIngestTransactionOperationName =
  | "validate_namespace_boundary"
  | "insert_memory_source"
  | "insert_memory_item"
  | "insert_memory_patch"
  | "insert_audit_log"
  | "finalize_idempotency_record";

export type MemoryIngestTransactionOperation = {
  operation: MemoryIngestTransactionOperationName | string;
  target: string;
  namespace: PandoraNamespace;
  appendOnly: boolean;
  writesNow: boolean;
};

export type MemoryIngestTransactionPlanInput = {
  namespace: PandoraNamespace;
  operations: MemoryIngestTransactionOperation[];
};

export type MemoryIngestTransactionPlanValidation = {
  status: "valid" | "blocked";
  namespace: PandoraNamespace;
  atomicityRequired: true;
  rollbackOnFailure: true;
  preferRpcOrTransactionWrapper: true;
  publicRouteMustUseBoundary: true;
  blockers: string[];
};

const REQUIRED_ORDER: MemoryIngestTransactionOperationName[] = [
  "validate_namespace_boundary",
  "insert_memory_source",
  "insert_memory_item",
  "insert_memory_patch",
  "insert_audit_log",
  "finalize_idempotency_record",
];

const FORBIDDEN_OPERATION_PATTERN = /(update|delete|overwrite|upsert|replace)/i;

export function validateMemoryIngestTransactionPlan(input: MemoryIngestTransactionPlanInput): RepositoryResult<MemoryIngestTransactionPlanValidation> {
  const blockers: string[] = [];
  const operationNames = input.operations.map((operation) => operation.operation);

  if (JSON.stringify(operationNames) !== JSON.stringify(REQUIRED_ORDER)) blockers.push("invalid_operation_order");
  if (!operationNames.includes("insert_audit_log")) blockers.push("missing_audit_log");
  if (!operationNames.includes("insert_memory_patch")) blockers.push("missing_memory_patch");
  if (operationNames[operationNames.length - 1] !== "finalize_idempotency_record") blockers.push("idempotency_finalization_not_last");

  for (const operation of input.operations) {
    if (operation.namespace !== input.namespace) blockers.push("namespace_mismatch");
    if (operation.appendOnly !== true) blockers.push("operation_not_append_only");
    if (operation.writesNow !== false) blockers.push("no_write_planning_phase_required");
    if (FORBIDDEN_OPERATION_PATTERN.test(operation.operation) || FORBIDDEN_OPERATION_PATTERN.test(operation.target)) blockers.push("forbidden_mutation_operation");
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  if (uniqueBlockers.length > 0) {
    return repositoryOk({
      status: "blocked",
      namespace: input.namespace,
      atomicityRequired: true,
      rollbackOnFailure: true,
      preferRpcOrTransactionWrapper: true,
      publicRouteMustUseBoundary: true,
      blockers: uniqueBlockers,
    });
  }

  return repositoryOk({
    status: "valid",
    namespace: input.namespace,
    atomicityRequired: true,
    rollbackOnFailure: true,
    preferRpcOrTransactionWrapper: true,
    publicRouteMustUseBoundary: true,
    blockers: [],
  });
}
