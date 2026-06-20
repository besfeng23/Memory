import type { RepositoryContext } from "@/lib/db/repository-context";
import type { RepositoryResult } from "@/lib/db/repository-result";
import type { PandoraNamespace } from "@/lib/supabase/database.types";

export type MemoryIngestAppendOnlyMode = "append_only";

export type MemoryIngestPersistenceBaseInput = {
  /** Authenticated ownership boundary. Implementations must read userId from this context only. */
  context: RepositoryContext;
  /** Namespace must match context.namespace and the parsed ingest request namespace. */
  namespace: PandoraNamespace;
  /** Must match context.userId. Client-supplied user_id values are never trusted. */
  userId: string;
  /** Future adapters must reject anything other than append_only and must not update/delete/overwrite rows. */
  appendOnly: true;
  mode: MemoryIngestAppendOnlyMode;
  requestHash?: string | null;
  fingerprint?: string | null;
};

export type InsertMemorySourceInput = MemoryIngestPersistenceBaseInput & {
  sourceRef: string | null;
  metadata: Record<string, unknown>;
};

export type InsertMemoryItemInput = MemoryIngestPersistenceBaseInput & {
  memorySourceId: string;
  input: string;
  metadata: Record<string, unknown>;
};

export type InsertMemoryPatchInput = MemoryIngestPersistenceBaseInput & {
  memoryItemId: string;
  memorySourceId: string;
  patchType: "ingest_append";
  metadata: Record<string, unknown>;
};

export type InsertAuditLogInput = MemoryIngestPersistenceBaseInput & {
  memorySourceId: string;
  memoryItemId: string;
  memoryPatchId: string;
  action: "memory_ingest_append_planned";
  metadata: Record<string, unknown>;
};

export type FinalizeIdempotencyRecordInput = MemoryIngestPersistenceBaseInput & {
  idempotencyKey: string | null;
  memorySourceId: string;
  memoryItemId: string;
  memoryPatchId: string;
  auditLogId: string;
};

export type InsertMemorySourceResult = { memorySourceId: string };
export type InsertMemoryItemResult = { memoryItemId: string };
export type InsertMemoryPatchResult = { memoryPatchId: string };
export type InsertAuditLogResult = { auditLogId: string };
export type FinalizeIdempotencyRecordResult = { idempotencyRecordId: string };

/**
 * Internal contract for future transactional memory ingest persistence adapters.
 *
 * Implementations must be append-only: insert new source/item/patch/audit/idempotency rows,
 * never update, delete, upsert-overwrite, or silently replace existing memory state. Every method
 * must enforce RepositoryContext ownership, namespace isolation, and authenticated context.userId.
 */
export type MemoryIngestPersistenceRepository = {
  insertMemorySource(input: InsertMemorySourceInput): Promise<RepositoryResult<InsertMemorySourceResult>>;
  insertMemoryItem(input: InsertMemoryItemInput): Promise<RepositoryResult<InsertMemoryItemResult>>;
  insertMemoryPatch(input: InsertMemoryPatchInput): Promise<RepositoryResult<InsertMemoryPatchResult>>;
  insertAuditLog(input: InsertAuditLogInput): Promise<RepositoryResult<InsertAuditLogResult>>;
  finalizeIdempotencyRecord(input: FinalizeIdempotencyRecordInput): Promise<RepositoryResult<FinalizeIdempotencyRecordResult>>;
};
