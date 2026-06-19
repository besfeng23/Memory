import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260620000400_idempotency_rpc_strategy.sql"),
  "utf8",
)
  .toLowerCase()
  .replace(/\s+/g, " ");

const claimName = "claim_idempotency_record";
const finishName = "finish_idempotency_record";
const createOperation = "create or replace function";

describe("idempotency RPC migration", () => {
  it("defines claim and finish functions", () => {
    expect(migrationSql).toContain(`${createOperation} public.${claimName}`);
    expect(migrationSql).toContain(`${createOperation} public.${finishName}`);
  });

  it("uses authenticated user ownership inside functions", () => {
    expect(migrationSql).toContain("v_user_id uuid := auth.uid()");
    expect(migrationSql).toContain("raise exception 'auth_required'");
    expect(migrationSql).toContain("user_id = v_user_id");
  });

  it("coordinates duplicate claims by scoped uniqueness", () => {
    expect(migrationSql).toContain("on conflict (user_id, namespace, fingerprint) do nothing");
    expect(migrationSql).toContain("return query select v_record_id, true, 'started'::text");
    expect(migrationSql).toContain("return query select v_record_id, false, v_existing_status");
  });

  it("restricts finish status to completed or failed", () => {
    expect(migrationSql).toContain("if p_status not in ('completed', 'failed') then");
    expect(migrationSql).toContain("raise exception 'invalid_idempotency_status'");
  });

  it("does not create public route artifacts", () => {
    expect(migrationSql).not.toContain("create route");
    expect(migrationSql).not.toContain("create endpoint");
    expect(migrationSql).not.toContain("create policy public");
  });
});
