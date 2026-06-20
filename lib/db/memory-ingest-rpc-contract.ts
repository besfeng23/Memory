import type { RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryIngestTransactionOperation } from "@/lib/db/memory-ingest-transaction-contract";
import type { Json, PandoraNamespace } from "@/lib/supabase/database.types";

export type MemoryIngestRpcInsertPayload = Record<string, Json | string | number | boolean | null>;

export type MemoryIngestTransactionalRpcRequest = {
  /** Authenticated userId derived from RepositoryContext only; never from client payloads. */
  userId: string;
  namespace: PandoraNamespace;
  source: MemoryIngestRpcInsertPayload;
  memoryItem: MemoryIngestRpcInsertPayload;
  memoryPatch: MemoryIngestRpcInsertPayload;
  auditLog: MemoryIngestRpcInsertPayload;
  idempotencyFinalization: MemoryIngestRpcInsertPayload;
  requestHash: string;
  fingerprint: string;
  operationOrder: MemoryIngestTransactionOperation[];
  invariants: {
    atomic: true;
    rollbackOnFailure: true;
    idempotencyFinalizationLast: true;
    appendOnly: true;
    namespaceIsolation: true;
    noUpdateDeleteOverwrite: true;
  };
};

export type MemoryIngestTransactionalRpcResponse = {
  status: "applied" | "blocked" | "error";
  generatedIds: {
    memorySourceId?: string;
    memoryItemId?: string;
    memoryPatchId?: string;
  };
  auditLogId?: string;
  idempotencyRecordId?: string;
  warnings: string[];
  blockers: string[];
  transactionRef: string;
  traceId: string;
};

export type MemoryIngestTransactionalRpcPlan = {
  context: RepositoryContext;
  namespace: PandoraNamespace;
  source: MemoryIngestRpcInsertPayload;
  memoryItem: MemoryIngestRpcInsertPayload;
  memoryPatch: MemoryIngestRpcInsertPayload;
  auditLog: MemoryIngestRpcInsertPayload;
  idempotencyFinalization: MemoryIngestRpcInsertPayload;
  requestHash: string;
  fingerprint: string;
  operationOrder: MemoryIngestTransactionOperation[];
  appendOnly: true;
};

export const MEMORY_INGEST_TRANSACTIONAL_RPC_NAME = "memory_ingest_apply_transaction";

/**
 * Contract notes for the future SQL RPC:
 * - The RPC must execute atomically in one database transaction and rollback on failure.
 * - Idempotency finalization must be the last insert.
 * - The operation is append-only: no update, delete, upsert, replace, or overwrite behavior.
 * - Namespace ownership must be enforced for every inserted row.
 */
export const MEMORY_INGEST_TRANSACTIONAL_RPC_INVARIANTS = {
  atomic: true,
  rollbackOnFailure: true,
  idempotencyFinalizationLast: true,
  appendOnly: true,
  namespaceIsolation: true,
  noUpdateDeleteOverwrite: true,
} as const;
