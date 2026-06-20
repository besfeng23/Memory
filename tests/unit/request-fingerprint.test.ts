import { describe, expect, it } from "vitest";
import { createRequestFingerprint, createRequestHash, stableJsonStringify } from "@/lib/api/request-fingerprint";

describe("request fingerprint helper", () => {
  it("produces stable JSON for objects with different key order", () => {
    expect(stableJsonStringify({ b: 2, a: 1 })).toBe(stableJsonStringify({ a: 1, b: 2 }));
  });

  it("produces stable hashes for matching request bodies", () => {
    expect(createRequestHash({ b: 2, a: { y: true, x: false } })).toBe(
      createRequestHash({ a: { x: false, y: true }, b: 2 }),
    );
  });

  it("includes namespace, route, and idempotency key in the fingerprint", () => {
    const base = createRequestFingerprint({
      namespace: "real_life",
      route: "/api/memory/ingest",
      idempotencyKey: "key-1234",
      body: { text: "hello" },
    });

    expect(base).not.toBe(
      createRequestFingerprint({
        namespace: "au",
        route: "/api/memory/ingest",
        idempotencyKey: "key-1234",
        body: { text: "hello" },
      }),
    );
  });
});
