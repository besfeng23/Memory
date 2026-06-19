import { describe, expect, it } from "vitest";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { createIdempotencyRecordsRepository } from "@/lib/db/core-repositories";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import type { IdempotencyRecordRow, PublicTableInsert } from "@/lib/supabase/database.types";
import { buildIdempotencyContext } from "@/lib/services/idempotency";
import {
  findIdempotencyRecord,
  prepareIdempotencyRecord,
  saveIdempotencyRecord,
} from "@/lib/services/persistent-idempotency";

const context: RepositoryContext = {
  userId: "user_id",
  namespace: "real_life",
};

function idempotencyContext() {
  const result = buildIdempotencyContext({
    userId: context.userId,
    namespace: context.namespace,
    scope: "memory_patch",
    operation: "saveMemoryPatch",
    clientKey: "client-key",
  });

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}

function idempotencyRecordRow(values: PublicTableInsert<"idempotency_records">): IdempotencyRecordRow {
  return {
    id: "idempotency_record_id",
    user_id: values.user_id,
    namespace: values.namespace,
    scope: values.scope,
    operation: values.operation,
    idempotency_key: values.idempotency_key,
    key_source: values.key_source,
    fingerprint: values.fingerprint,
    request_hash: values.request_hash,
    response_hash: values.response_hash,
    status: values.status,
    metadata: values.metadata,
    expires_at: values.expires_at,
    created_at: values.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: values.updated_at,
  };
}

describe("persistent idempotency helpers", () => {
  it("prepares a durable idempotency record without caller supplied owner", () => {
    const result = prepareIdempotencyRecord({
      context,
      idempotency: idempotencyContext(),
      requestHash: "request_hash",
      metadata: { route: "internal" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        namespace: "real_life",
        scope: "memory_patch",
        operation: "saveMemoryPatch",
        idempotency_key: "client-key",
        key_source: "client",
        request_hash: "request_hash",
        response_hash: null,
        status: "started",
      });
      expect(result.data).not.toHaveProperty("user_id");
    }
  });

  it("rejects user mismatches before persistence", () => {
    const result = prepareIdempotencyRecord({
      context: { ...context, userId: "other_user" },
      idempotency: idempotencyContext(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
    }
  });

  it("rejects namespace mismatches before persistence", () => {
    const result = prepareIdempotencyRecord({
      context: { ...context, namespace: "au" },
      idempotency: idempotencyContext(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("namespace_mismatch");
    }
  });

  it("saves idempotency records through the repository boundary", async () => {
    const createdRecords: Array<PublicTableInsert<"idempotency_records">> = [];
    const repository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create(input) {
        const values = { ...input.values, user_id: input.context.userId } satisfies PublicTableInsert<"idempotency_records">;
        createdRecords.push(values);
        return repositoryOk(idempotencyRecordRow(values));
      },
    } satisfies ReturnType<typeof createIdempotencyRecordsRepository>;

    const result = await saveIdempotencyRecord(
      {
        context,
        idempotency: idempotencyContext(),
        status: "completed",
        responseHash: "response_hash",
      },
      { repository },
    );

    expect(result.ok).toBe(true);
    expect(createdRecords).toHaveLength(1);
    expect(createdRecords[0]).toMatchObject({
      user_id: "user_id",
      namespace: "real_life",
      status: "completed",
      response_hash: "response_hash",
    });
  });

  it("finds records by scoped fingerprint after owner and namespace filtering", async () => {
    const idempotency = idempotencyContext();
    const repository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list(input) {
        expect(input.context).toEqual(context);
        expect(input.tableName).toBe("idempotency_records");
        return repositoryOk([
          idempotencyRecordRow({
            user_id: "user_id",
            namespace: "real_life",
            scope: "memory_patch",
            operation: "otherOperation",
            idempotency_key: "other-key",
            key_source: "client",
            fingerprint: "other_fingerprint",
            request_hash: null,
            response_hash: null,
            status: "started",
            metadata: {},
            expires_at: null,
            updated_at: "2026-01-01T00:00:00.000Z",
          }),
          idempotencyRecordRow({
            user_id: "user_id",
            namespace: "real_life",
            scope: "memory_patch",
            operation: idempotency.operation,
            idempotency_key: idempotency.key,
            key_source: idempotency.keySource,
            fingerprint: idempotency.fingerprint,
            request_hash: null,
            response_hash: null,
            status: "started",
            metadata: {},
            expires_at: null,
            updated_at: "2026-01-01T00:00:00.000Z",
          }),
        ]);
      },
      async create() {
        return repositoryError("database_error", "not used");
      },
    } satisfies ReturnType<typeof createIdempotencyRecordsRepository>;

    const result = await findIdempotencyRecord(context, idempotency.fingerprint, { repository });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.fingerprint).toBe(idempotency.fingerprint);
    }
  });

  it("returns null when no idempotency record is found", async () => {
    const repository = {
      async getById() {
        return repositoryError("not_found", "not used");
      },
      async list() {
        return repositoryOk([]);
      },
      async create() {
        return repositoryError("database_error", "not used");
      },
    } satisfies ReturnType<typeof createIdempotencyRecordsRepository>;

    const result = await findIdempotencyRecord(context, "missing_fingerprint", { repository });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });
});
