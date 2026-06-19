import { describe, expect, it } from "vitest";
import {
  ALL_PANDORA_TABLE_NAMES,
  AU_TABLE_NAMES,
  CORE_TABLE_NAMES,
  REAL_LIFE_TABLE_NAMES,
  isAuTableName,
  isPandoraTableName,
  isRealLifeTableName,
} from "@/lib/db/table-names";
import { expectedNamespaceForTable, tableAllowsNamespace } from "@/lib/db/namespaces";
import type {
  ClaimIdempotencyRecordArgs,
  FinishIdempotencyRecordArgs,
  PublicFunctionName,
  PublicTableName,
  PublicTableRow,
} from "@/lib/supabase/database.types";

const requiredTables = [
  "memory_items",
  "memory_sources",
  "memory_patches",
  "retrieval_logs",
  "prompt_logs",
  "audit_logs",
  "idempotency_records",
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
] as const satisfies readonly PublicTableName[];

const requiredFunctions = ["claim_idempotency_record", "finish_idempotency_record"] as const satisfies readonly PublicFunctionName[];

describe("database type foundation", () => {
  it("tracks all Pandora table names", () => {
    expect(ALL_PANDORA_TABLE_NAMES).toEqual(requiredTables);
    expect(new Set(ALL_PANDORA_TABLE_NAMES).size).toBe(ALL_PANDORA_TABLE_NAMES.length);
  });

  it("tracks public database functions", () => {
    expect(requiredFunctions).toEqual(["claim_idempotency_record", "finish_idempotency_record"]);
  });

  it("groups core, real-life, and AU tables", () => {
    expect(CORE_TABLE_NAMES).toContain("memory_items");
    expect(CORE_TABLE_NAMES).toContain("idempotency_records");
    expect(REAL_LIFE_TABLE_NAMES).toContain("people");
    expect(AU_TABLE_NAMES).toContain("au_worlds");
  });

  it("validates table name helpers", () => {
    expect(isPandoraTableName("memory_items")).toBe(true);
    expect(isPandoraTableName("idempotency_records")).toBe(true);
    expect(isPandoraTableName("unknown_table")).toBe(false);
    expect(isRealLifeTableName("people")).toBe(true);
    expect(isRealLifeTableName("au_worlds")).toBe(false);
    expect(isAuTableName("au_scenes")).toBe(true);
    expect(isAuTableName("people")).toBe(false);
  });

  it("maps namespace expectations by table group", () => {
    expect(expectedNamespaceForTable("people")).toBe("real_life");
    expect(expectedNamespaceForTable("au_worlds")).toBe("au");
    expect(expectedNamespaceForTable("memory_items")).toBeNull();
    expect(expectedNamespaceForTable("idempotency_records")).toBeNull();

    expect(tableAllowsNamespace("people", "real_life")).toBe(true);
    expect(tableAllowsNamespace("people", "au")).toBe(false);
    expect(tableAllowsNamespace("au_worlds", "au")).toBe(true);
    expect(tableAllowsNamespace("au_worlds", "real_life")).toBe(false);
    expect(tableAllowsNamespace("memory_items", "real_life")).toBe(true);
    expect(tableAllowsNamespace("memory_items", "au")).toBe(true);
    expect(tableAllowsNamespace("idempotency_records", "real_life")).toBe(true);
    expect(tableAllowsNamespace("idempotency_records", "au")).toBe(true);
  });

  it("exposes schema-aligned row types", () => {
    const memoryItem = {
      id: "item_id",
      user_id: "user_id",
      namespace: "real_life",
      memory_type: "observation",
      title: "Neutral title",
      body: "Neutral body",
      strength: "medium",
      confidence: 0.5,
      canon_status: "draft",
      source_summary: null,
      metadata: {},
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    } satisfies PublicTableRow<"memory_items">;

    const idempotencyRecord = {
      id: "idempotency_id",
      user_id: "user_id",
      namespace: "real_life",
      scope: "memory_patch",
      operation: "saveMemoryPatch",
      idempotency_key: "client-key",
      key_source: "client",
      fingerprint: "fingerprint",
      request_hash: null,
      response_hash: null,
      status: "started",
      metadata: {},
      expires_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    } satisfies PublicTableRow<"idempotency_records">;

    const auWorld = {
      id: "world_id",
      user_id: "user_id",
      namespace: "au",
      name: "Neutral world",
      premise: null,
      canon_status: "draft",
      metadata: {},
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    } satisfies PublicTableRow<"au_worlds">;

    expect(memoryItem.namespace).toBe("real_life");
    expect(idempotencyRecord.status).toBe("started");
    expect(auWorld.namespace).toBe("au");
  });

  it("exposes idempotency RPC argument types", () => {
    const claimArgs = {
      p_namespace: "real_life",
      p_scope: "memory_patch",
      p_operation: "saveMemoryPatch",
      p_idempotency_key: "client-key",
      p_key_source: "client",
      p_fingerprint: "fingerprint",
      p_request_hash: null,
      p_expires_at: null,
      p_metadata: {},
    } satisfies ClaimIdempotencyRecordArgs;

    const finishArgs = {
      p_record_id: "record_id",
      p_namespace: "real_life",
      p_fingerprint: "fingerprint",
      p_status: "completed",
      p_response_hash: null,
      p_metadata: {},
    } satisfies FinishIdempotencyRecordArgs;

    expect(claimArgs.p_key_source).toBe("client");
    expect(finishArgs.p_status).toBe("completed");
  });
});
