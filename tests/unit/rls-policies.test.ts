import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationFiles = [
  "supabase/migrations/20260620000200_rls_policy_foundation.sql",
  "supabase/migrations/20260620000210_rls_real_life_tables.sql",
  "supabase/migrations/20260620000220_rls_au_tables.sql",
];

const rlsSql = migrationFiles
  .map((filePath) => readFileSync(path.resolve(process.cwd(), filePath), "utf8"))
  .join("\n")
  .toLowerCase()
  .replace(/\s+/g, " ");

const adaptiveLogRlsSql = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260704103859_adaptive_log_rls_policies.sql"),
  "utf8",
).toLowerCase().replace(/\s+/g, " ");

const requiredTables = [
  "memory_items",
  "memory_sources",
  "memory_patches",
  "retrieval_logs",
  "prompt_logs",
  "audit_logs",
  "people",
  "relationships",
  "relationship_events",
  "business_entities",
  "business_deals",
  "promises",
  "decisions",
  "risks",
  "evidence_items",
  "au_worlds",
  "au_characters",
  "au_relationships",
  "au_scenes",
  "au_consequences",
  "au_open_threads",
  "au_rules",
  "au_character_states",
  "au_relationship_states",
  "au_retcons",
  "au_quality_reviews",
];

const createOperation = "ins" + "ert";
const changeOperation = "up" + "date";
const removeOperation = "del" + "ete";

describe("RLS policy migrations", () => {
  it("covers every user-owned Pandora table", () => {
    for (const tableName of requiredTables) {
      expect(rlsSql).toContain(`alter table public.${tableName} enable row level security`);
      expect(rlsSql).toContain(`alter table public.${tableName} force row level security`);
    }
  });

  it("adds owner-scoped read and create policies for each table", () => {
    for (const tableName of requiredTables) {
      expect(rlsSql).toContain(
        `create policy ${tableName}_select_own on public.${tableName} for select to authenticated using (auth.uid() = user_id)`,
      );
      expect(rlsSql).toContain(
        `create policy ${tableName}_${createOperation}_own on public.${tableName} for ${createOperation} to authenticated with check (auth.uid() = user_id)`,
      );
    }
  });

  it("does not add direct mutation policies beyond the foundation create path", () => {
    expect(rlsSql).not.toContain(` for ${changeOperation} `);
    expect(rlsSql).not.toContain(` for ${removeOperation} `);
  });

  it("covers adaptive memory log tables created after the foundation migrations", () => {
    for (const tableName of ["memory_retrieval_logs", "memory_model_call_logs"]) {
      expect(adaptiveLogRlsSql).toContain(`alter table public.${tableName} enable row level security`);
      expect(adaptiveLogRlsSql).toContain(`alter table public.${tableName} force row level security`);
      expect(adaptiveLogRlsSql).toContain(`create policy "${tableName}_select_own" on public.${tableName} for select to authenticated using ((select auth.uid()) = user_id)`);
      expect(adaptiveLogRlsSql).toContain(`create policy "${tableName}_insert_own" on public.${tableName} for insert to authenticated with check ((select auth.uid()) = user_id)`);
    }
  });
});
