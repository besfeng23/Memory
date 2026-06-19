import { describe, expect, it } from "vitest";
import { buildIdempotencyContext, validateIdempotencyKey } from "@/lib/services/idempotency";

describe("idempotency helpers", () => {
  it("validates safe idempotency keys", () => {
    const result = validateIdempotencyKey(" request-123:abc_def.456 ");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe("request-123:abc_def.456");
    }
  });

  it("rejects empty idempotency keys", () => {
    const result = validateIdempotencyKey("   ");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
    }
  });

  it("rejects unsupported characters", () => {
    const result = validateIdempotencyKey("bad key with spaces");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
    }
  });

  it("builds a user and namespace scoped fingerprint", () => {
    const result = buildIdempotencyContext({
      userId: "user_id",
      namespace: "real_life",
      scope: "memory_patch",
      operation: "saveMemoryPatch",
      clientKey: "client-key-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        userId: "user_id",
        namespace: "real_life",
        scope: "memory_patch",
        operation: "saveMemoryPatch",
        key: "client-key-1",
        keySource: "client",
      });
      expect(result.data.fingerprint).toBe(
        "user:user_id|namespace:real_life|scope:memory_patch|operation:saveMemoryPatch|key:client-key-1",
      );
    }
  });

  it("falls back to request id then payload hash", () => {
    const requestIdResult = buildIdempotencyContext({
      userId: "user_id",
      namespace: "au",
      scope: "retrieval",
      operation: "retrieveMemoryItems",
      requestId: "request-id",
      payloadHash: "payload-hash",
    });

    expect(requestIdResult.ok).toBe(true);
    if (requestIdResult.ok) {
      expect(requestIdResult.data.key).toBe("request-id");
      expect(requestIdResult.data.keySource).toBe("request");
    }

    const payloadHashResult = buildIdempotencyContext({
      userId: "user_id",
      namespace: "au",
      scope: "retrieval",
      operation: "retrieveMemoryItems",
      payloadHash: "payload-hash",
    });

    expect(payloadHashResult.ok).toBe(true);
    if (payloadHashResult.ok) {
      expect(payloadHashResult.data.key).toBe("payload-hash");
      expect(payloadHashResult.data.keySource).toBe("payload");
    }
  });

  it("requires at least one idempotency key source", () => {
    const result = buildIdempotencyContext({
      userId: "user_id",
      namespace: "real_life",
      scope: "memory_candidate",
      operation: "saveMemoryCandidate",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_failed");
    }
  });
});
