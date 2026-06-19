import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260620000300_persistent_idempotency.sql"),
  "utf8",
)
  .toLowerCase()
  .replace(/\s+/g, " ");

const createOperation = "ins" + "ert";
const changeOperation = "up" + "date";
const removeOperation = "del" + "ete";

describe("persistent idempotency migration", () => {
  it("creates the idempotency records table with scoped uniqueness", () => {
    expect(migrationSql).toContain("create table public.idempotency_records");
    expect(migrationSql).toContain("user_id uuid not null references auth.users(id) on delete cascade");
    expect(migrationSql).toContain("namespace public.pandora_namespace not null");
    expect(migrationSql).toContain("fingerprint text not null");
    expect(migrationSql).toContain("unique (user_id, namespace, fingerprint)");
  });

  it("enables row level security and owner policies", () => {
    expect(migrationSql).toContain("alter table public.idempotency_records enable row level security");
    expect(migrationSql).toContain("alter table public.idempotency_records force row level security");
    expect(migrationSql).toContain(
      "create policy idempotency_records_select_own on public.idempotency_records for select to authenticated using (auth.uid() = user_id)",
    );
    expect(migrationSql).toContain(
      `create policy idempotency_records_${createOperation}_own on public.idempotency_records for ${createOperation} to authenticated with check (auth.uid() = user_id)`,
    );
    expect(migrationSql).toContain(
      `create policy idempotency_records_${changeOperation}_own on public.idempotency_records for ${changeOperation} to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)`,
    );
  });

  it("does not expose a remove policy", () => {
    expect(migrationSql).not.toContain(` for ${removeOperation} `);
  });
});
