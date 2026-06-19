import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@/lib/db/repository-context";
import { assertInsertNamespace, assertRowNamespace, assertTableNamespace } from "@/lib/db/repository-guards";
import { repositoryError, repositoryOk } from "@/lib/db/repository-result";
import { withOwner } from "@/lib/db/repository-contracts";
import { createServiceContext, prepareOwnedInsert } from "@/lib/services/service-boundary";
import type { PublicTableInsert, PublicTableRow } from "@/lib/supabase/database.types";

describe("repository result helpers", () => {
  it("returns structured success and error results", () => {
    expect(repositoryOk({ value: true })).toEqual({ ok: true, data: { value: true } });
    expect(repositoryError("validation_failed", "Neutral error")).toEqual({
      ok: false,
      error: { code: "validation_failed", message: "Neutral error", details: undefined },
    });
  });
});

describe("repository context", () => {
  it("requires an authenticated user id", () => {
    const missingContext = createRepositoryContext({ userId: "", namespace: "real_life" });

    expect(missingContext.ok).toBe(false);
    if (!missingContext.ok) {
      expect(missingContext.error.code).toBe("auth_required");
    }
  });

  it("normalizes and stores repository context", () => {
    const context = createServiceContext({ userId: " user_id ", namespace: "au", requestId: "request_id" });

    expect(context).toEqual({
      ok: true,
      data: {
        userId: "user_id",
        namespace: "au",
        requestId: "request_id",
      },
    });
  });
});

describe("repository namespace guards", () => {
  it("accepts allowed table namespaces", () => {
    expect(assertTableNamespace("people", "real_life").ok).toBe(true);
    expect(assertTableNamespace("au_worlds", "au").ok).toBe(true);
    expect(assertTableNamespace("memory_items", "real_life").ok).toBe(true);
    expect(assertTableNamespace("memory_items", "au").ok).toBe(true);
  });

  it("rejects namespace/table mismatches", () => {
    expect(assertTableNamespace("people", "au").ok).toBe(false);
    expect(assertTableNamespace("au_worlds", "real_life").ok).toBe(false);
  });

  it("checks row namespace boundaries", () => {
    const personRow = { namespace: "real_life" } satisfies Pick<PublicTableRow<"people">, "namespace">;
    const auRow = { namespace: "au" } satisfies Pick<PublicTableRow<"au_worlds">, "namespace">;

    expect(assertRowNamespace("people", personRow).ok).toBe(true);
    expect(assertRowNamespace("au_worlds", auRow).ok).toBe(true);
  });

  it("checks insert namespace boundaries", () => {
    const personInsert = { namespace: "real_life" } satisfies Pick<PublicTableInsert<"people">, "namespace">;
    const auInsert = { namespace: "au" } satisfies Pick<PublicTableInsert<"au_worlds">, "namespace">;

    expect(assertInsertNamespace("people", personInsert).ok).toBe(true);
    expect(assertInsertNamespace("au_worlds", auInsert).ok).toBe(true);
  });
});

describe("service boundary", () => {
  it("attaches owner id from context", () => {
    const context = {
      userId: "user_id",
      namespace: "real_life" as const,
    };

    const values = {
      namespace: "real_life" as const,
      display_name: "Neutral person",
      aliases: [],
      notes: null,
      metadata: {},
      is_active: true,
      updated_at: "2026-01-01T00:00:00.000Z",
    } satisfies Omit<PublicTableInsert<"people">, "user_id">;

    const owned = withOwner(context, values);

    expect(owned.user_id).toBe("user_id");
    expect(owned.namespace).toBe("real_life");
  });

  it("prepares owner-bound values only when namespace matches", () => {
    const context = {
      userId: "user_id",
      namespace: "real_life" as const,
    };

    const result = prepareOwnedInsert({
      context,
      tableName: "people",
      values: {
        namespace: "real_life",
        display_name: "Neutral person",
        aliases: [],
        notes: null,
        metadata: {},
        is_active: true,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user_id).toBe("user_id");
      expect(result.data.namespace).toBe("real_life");
    }
  });

  it("rejects service preparation when table namespace conflicts with context", () => {
    const result = prepareOwnedInsert({
      context: {
        userId: "user_id",
        namespace: "au",
      },
      tableName: "people",
      values: {
        namespace: "real_life",
        display_name: "Neutral person",
        aliases: [],
        notes: null,
        metadata: {},
        is_active: true,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("namespace_mismatch");
    }
  });
});
