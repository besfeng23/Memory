import { describe, expect, it } from "vitest";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { buildIdempotencyContext } from "@/lib/services/idempotency";
import {
  claimIdempotencyRecord,
  finishIdempotencyRecord,
  type IdempotencyRpcClient,
} from "@/lib/services/idempotency-rpc";

const context: RepositoryContext = {
  userId: "user_id",
  namespace: "real_life",
};

function buildContext() {
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

describe("idempotency RPC helpers", () => {
  it("claims an idempotency record through the database function boundary", async () => {
    const idempotency = buildContext();
    const calls: Array<{ name: string; args: unknown }> = [];
    const client: IdempotencyRpcClient = {
      async rpc(functionName, args) {
        calls.push({ name: functionName, args });
        return {
          data: [
            {
              record_id: "record_id",
              was_claimed: true,
              existing_status: "started",
            },
          ],
          error: null,
        };
      },
    };

    const result = await claimIdempotencyRecord(
      {
        context,
        idempotency,
        requestHash: "request_hash",
        metadata: { source: "unit_test" },
      },
      { createClient: async () => client },
    );

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      name: "claim_idempotency_record",
      args: {
        p_namespace: "real_life",
        p_scope: "memory_patch",
        p_operation: "saveMemoryPatch",
        p_idempotency_key: "client-key",
        p_key_source: "client",
        p_fingerprint: idempotency.fingerprint,
        p_request_hash: "request_hash",
      },
    });

    if (result.ok) {
      expect(result.data).toEqual({
        recordId: "record_id",
        wasClaimed: true,
        existingStatus: "started",
      });
    }
  });

  it("reports existing idempotency records without claiming a duplicate", async () => {
    const client: IdempotencyRpcClient = {
      async rpc() {
        return {
          data: [
            {
              record_id: "existing_record_id",
              was_claimed: false,
              existing_status: "completed",
            },
          ],
          error: null,
        };
      },
    };

    const result = await claimIdempotencyRecord(
      {
        context,
        idempotency: buildContext(),
      },
      { createClient: async () => client },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.wasClaimed).toBe(false);
      expect(result.data.existingStatus).toBe("completed");
    }
  });

  it("finishes an idempotency record through the database function boundary", async () => {
    const idempotency = buildContext();
    const calls: Array<{ name: string; args: unknown }> = [];
    const client: IdempotencyRpcClient = {
      async rpc(functionName, args) {
        calls.push({ name: functionName, args });
        return {
          data: [
            {
              record_id: "record_id",
              final_status: "completed",
            },
          ],
          error: null,
        };
      },
    };

    const result = await finishIdempotencyRecord(
      {
        context,
        idempotency,
        recordId: "record_id",
        status: "completed",
        responseHash: "response_hash",
      },
      { createClient: async () => client },
    );

    expect(result.ok).toBe(true);
    expect(calls[0]).toMatchObject({
      name: "finish_idempotency_record",
      args: {
        p_record_id: "record_id",
        p_namespace: "real_life",
        p_fingerprint: idempotency.fingerprint,
        p_status: "completed",
        p_response_hash: "response_hash",
      },
    });

    if (result.ok) {
      expect(result.data.finalStatus).toBe("completed");
    }
  });

  it("rejects namespace mismatches before calling RPC", async () => {
    let called = false;
    const client: IdempotencyRpcClient = {
      async rpc() {
        called = true;
        return { data: [], error: null };
      },
    };

    const result = await claimIdempotencyRecord(
      {
        context: { ...context, namespace: "au" },
        idempotency: buildContext(),
      },
      { createClient: async () => client },
    );

    expect(result.ok).toBe(false);
    expect(called).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("namespace_mismatch");
    }
  });

  it("returns database errors from RPC calls", async () => {
    const client: IdempotencyRpcClient = {
      async rpc() {
        return {
          data: null,
          error: {
            message: "rpc failed",
            code: "P0001",
          },
        };
      },
    };

    const result = await claimIdempotencyRecord(
      {
        context,
        idempotency: buildContext(),
      },
      { createClient: async () => client },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("database_error");
      expect(result.error.message).toBe("rpc failed");
    }
  });
});
