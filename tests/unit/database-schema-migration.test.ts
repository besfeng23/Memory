import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20260620000100_core_database_schema.sql");
const migrationSql = readFileSync(migrationPath, "utf8").toLowerCase();

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

describe("core database schema migration", () => {
  it("creates the required core, real-life, and AU/story tables", () => {
    for (const tableName of requiredTables) {
      expect(migrationSql).toContain(`create table public.${tableName}`);
    }
  });

  it("requires user ownership and namespace columns on user-owned domain tables", () => {
    for (const tableName of requiredTables) {
      const tableStart = migrationSql.indexOf(`create table public.${tableName}`);
      const nextTable = migrationSql.indexOf("create table public.", tableStart + 1);
      const tableSql = migrationSql.slice(tableStart, nextTable === -1 ? undefined : nextTable);

      expect(tableSql).toContain("user_id uuid not null references auth.users(id)");
      expect(tableSql).toContain("namespace public.pandora_namespace");
    }
  });

  it("prepares append-only and audit structures without implementing behavior", () => {
    expect(migrationSql).toContain("create table public.memory_patches");
    expect(migrationSql).toContain("create table public.audit_logs");
    expect(migrationSql).toContain("before_snapshot jsonb");
    expect(migrationSql).toContain("after_snapshot jsonb");
  });

  it("enables RLS but does not create policies in this schema migration", () => {
    for (const tableName of requiredTables) {
      expect(migrationSql).toContain(`alter table public.${tableName} enable row level security`);
    }

    expect(migrationSql).not.toContain("create policy");
  });

  it("does not enable pgvector or create fake seed data", () => {
    expect(migrationSql).not.toContain("create extension if not exists vector");
    expect(migrationSql).not.toContain("insert into");
  });
});
