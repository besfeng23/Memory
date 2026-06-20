import type {
  FinalizeIdempotencyRecordInput,
  FinalizeIdempotencyRecordResult,
  InsertAuditLogInput,
  InsertAuditLogResult,
  InsertMemoryItemInput,
  InsertMemoryItemResult,
  InsertMemoryPatchInput,
  InsertMemoryPatchResult,
  InsertMemorySourceInput,
  InsertMemorySourceResult,
  MemoryIngestPersistenceBaseInput,
  MemoryIngestPersistenceRepository,
} from "@/lib/db/memory-ingest-persistence-contract";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import type { Json } from "@/lib/supabase/database.types";

type MemoryIngestTableName = "memory_sources" | "memory_items" | "memory_patches" | "audit_logs" | "idempotency_records";

type MemoryIngestInsertResult<Row> = { data: Row | null; error: { message?: string; code?: string; details?: string } | null };

type MemoryIngestInsertBuilder<Row> = {
  select(columns: "id"): { single(): Promise<MemoryIngestInsertResult<Row>> };
};

type MemoryIngestTableClient<Row> = {
  insert(row: Record<string, unknown>): MemoryIngestInsertBuilder<Row>;
};

export type MemoryIngestSupabaseClient = {
  from(table: MemoryIngestTableName): MemoryIngestTableClient<{ id: string }>;
};

export type SupabaseMemoryIngestPersistenceAdapterInput = {
  client: MemoryIngestSupabaseClient;
};

function validateBaseInput(input: MemoryIngestPersistenceBaseInput): RepositoryResult<{ userId: string }> {
  const contextUserId = input.context.userId.trim();
  if (!contextUserId) return repositoryError("auth_required", "Authenticated repository context userId is required.");
  if (input.namespace !== input.context.namespace) return repositoryError("namespace_mismatch", "Persistence namespace must match repository context namespace.");
  if (input.userId !== input.context.userId) return repositoryError("auth_required", "Persistence userId must be derived from repository context only.");
  if (input.appendOnly !== true || input.mode !== "append_only") return repositoryError("validation_failed", "Memory ingest persistence adapter only supports append-only inserts.");
  return repositoryOk({ userId: contextUserId });
}

async function insertRow(client: MemoryIngestSupabaseClient, table: MemoryIngestTableName, row: Record<string, unknown>): Promise<RepositoryResult<{ id: string }>> {
  const result = await client.from(table).insert(row).select("id").single();
  if (result.error) return repositoryError("database_error", "Memory ingest persistence insert failed.", { table, error: result.error });
  if (!result.data?.id) return repositoryError("database_error", "Memory ingest persistence insert did not return an id.", { table });
  return repositoryOk({ id: result.data.id });
}

function metadata(input: MemoryIngestPersistenceBaseInput, extra: Record<string, unknown> = {}): Json {
  return {
    ...extra,
    request_hash: input.requestHash ?? null,
    fingerprint: input.fingerprint ?? null,
    request_id: input.context.requestId ?? null,
    append_only: true,
  };
}

export function createSupabaseMemoryIngestPersistenceAdapter(input: SupabaseMemoryIngestPersistenceAdapterInput): MemoryIngestPersistenceRepository {
  return {
    async insertMemorySource(sourceInput: InsertMemorySourceInput): Promise<RepositoryResult<InsertMemorySourceResult>> {
      const valid = validateBaseInput(sourceInput);
      if (!valid.ok) return valid;
      const inserted = await insertRow(input.client, "memory_sources", {
        user_id: valid.data.userId,
        namespace: sourceInput.context.namespace,
        source_type: "user_statement",
        source_ref: sourceInput.sourceRef,
        excerpt: null,
        confidence: 1,
        memory_item_id: null,
        metadata: metadata(sourceInput, { request_metadata: sourceInput.metadata }),
      });
      return inserted.ok ? repositoryOk({ memorySourceId: inserted.data.id }) : inserted;
    },

    async insertMemoryItem(itemInput: InsertMemoryItemInput): Promise<RepositoryResult<InsertMemoryItemResult>> {
      const valid = validateBaseInput(itemInput);
      if (!valid.ok) return valid;
      const inserted = await insertRow(input.client, "memory_items", {
        user_id: valid.data.userId,
        namespace: itemInput.context.namespace,
        memory_type: itemInput.context.namespace === "au" ? "soft_canon" : "real_life_fact",
        title: "Memory ingest append",
        body: itemInput.input,
        strength: "low",
        confidence: 1,
        canon_status: itemInput.context.namespace === "au" ? "draft" : "soft_canon",
        source_summary: itemInput.memorySourceId,
        is_active: true,
        metadata: metadata(itemInput, { memory_source_id: itemInput.memorySourceId, request_metadata: itemInput.metadata }),
      });
      return inserted.ok ? repositoryOk({ memoryItemId: inserted.data.id }) : inserted;
    },

    async insertMemoryPatch(patchInput: InsertMemoryPatchInput): Promise<RepositoryResult<InsertMemoryPatchResult>> {
      const valid = validateBaseInput(patchInput);
      if (!valid.ok) return valid;
      const inserted = await insertRow(input.client, "memory_patches", {
        user_id: valid.data.userId,
        namespace: patchInput.context.namespace,
        memory_item_id: patchInput.memoryItemId,
        patch_type: patchInput.patchType,
        reason: "memory_ingest_append",
        before_snapshot: null,
        after_snapshot: metadata(patchInput, { memory_source_id: patchInput.memorySourceId, request_metadata: patchInput.metadata }),
        metadata: metadata(patchInput),
      });
      return inserted.ok ? repositoryOk({ memoryPatchId: inserted.data.id }) : inserted;
    },

    async insertAuditLog(auditInput: InsertAuditLogInput): Promise<RepositoryResult<InsertAuditLogResult>> {
      const valid = validateBaseInput(auditInput);
      if (!valid.ok) return valid;
      const inserted = await insertRow(input.client, "audit_logs", {
        user_id: valid.data.userId,
        namespace: auditInput.context.namespace,
        action: auditInput.action,
        table_name: "memory_patches",
        record_id: auditInput.memoryPatchId,
        before_snapshot: null,
        after_snapshot: metadata(auditInput, { memory_source_id: auditInput.memorySourceId, memory_item_id: auditInput.memoryItemId, memory_patch_id: auditInput.memoryPatchId, request_metadata: auditInput.metadata }),
        metadata: metadata(auditInput),
      });
      return inserted.ok ? repositoryOk({ auditLogId: inserted.data.id }) : inserted;
    },

    async finalizeIdempotencyRecord(idempotencyInput: FinalizeIdempotencyRecordInput): Promise<RepositoryResult<FinalizeIdempotencyRecordResult>> {
      const valid = validateBaseInput(idempotencyInput);
      if (!valid.ok) return valid;
      const inserted = await insertRow(input.client, "idempotency_records", {
        user_id: valid.data.userId,
        namespace: idempotencyInput.context.namespace,
        scope: "memory_ingest",
        operation: "append_memory",
        idempotency_key: idempotencyInput.idempotencyKey ?? idempotencyInput.fingerprint ?? idempotencyInput.requestHash ?? "generated-by-transaction-boundary",
        key_source: idempotencyInput.idempotencyKey ? "client" : "request",
        fingerprint: idempotencyInput.fingerprint ?? "pending-transaction-fingerprint",
        request_hash: idempotencyInput.requestHash ?? null,
        response_hash: null,
        status: "completed",
        expires_at: null,
        metadata: metadata(idempotencyInput, { memory_source_id: idempotencyInput.memorySourceId, memory_item_id: idempotencyInput.memoryItemId, memory_patch_id: idempotencyInput.memoryPatchId, audit_log_id: idempotencyInput.auditLogId }),
      });
      return inserted.ok ? repositoryOk({ idempotencyRecordId: inserted.data.id }) : inserted;
    },
  };
}
