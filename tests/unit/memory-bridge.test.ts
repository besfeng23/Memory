import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { captureMemoryEvent, createContextPack } from "@/lib/services/memory-bridge-service";
import { buildDailyContextPack, compactContextResponse } from "@/lib/services/memory-distillation-service";

const principal = { ok: true, userId: "00000000-0000-0000-0000-000000000001", createdBy: "00000000-0000-0000-0000-000000000001", authType: "bridge_token", operator: true } as const;
const runtime = (gates: Partial<Record<string, boolean>>) => ({ config: { memoryCaptureApiEnabled: false, memoryContextApiEnabled: false, memoryDistillationEnabled: false, publicMemoryReadEnabled: false, publicMemoryPersistenceEnabled: false, modelCallsEnabled: false, embeddingsEnabled: false, semanticRetrievalEnabled: false, mcpEnabled: false, ...gates }, gates: { memoryCaptureApiEnabled: { envVar: "PANDORA_ENABLE_MEMORY_CAPTURE_API" }, memoryContextApiEnabled: { envVar: "PANDORA_ENABLE_MEMORY_CONTEXT_API" }, memoryDistillationEnabled: { envVar: "PANDORA_ENABLE_MEMORY_DISTILLATION" } } }) as never;
function client() {
  const rows: Record<string, unknown>[] = [];
  return { rows, from(table: string) { let pending: Record<string, unknown> | null = null; return { select(){ return this; }, insert(value: Record<string, unknown>){ pending = { id: `${table}-1`, ...value }; rows.push({ table, ...pending }); return this; }, update(value: Record<string, unknown>){ pending = value; return this; }, eq(){ return this; }, neq(){ return this; }, order(){ return this; }, limit(){ return this; }, async single(){ return { data: pending, error: null }; }, async range(){ return { data: rows, error: null }; } }; } } as never;
}

describe("daily ChatGPT memory bridge", () => {
  it("blocks capture when gate is disabled or auth is missing", async () => {
    expect((await captureMemoryEvent(client(), { namespace: "real_life", raw_text: "x" }, principal, runtime({}))).ok).toBe(false);
    expect((await captureMemoryEvent(client(), { namespace: "real_life", raw_text: "x" }, { ok: false, blockers: ["auth_required"] }, runtime({ memoryCaptureApiEnabled: true }))).ok).toBe(false);
  });
  it("accepts valid bridge principal, rejects empty text, and audits capture", async () => {
    const c = client() as { rows: Record<string, unknown>[] };
    expect((await captureMemoryEvent(c as never, { namespace: "real_life", raw_text: " " }, principal, runtime({ memoryCaptureApiEnabled: true }))).ok).toBe(false);
    const result = await captureMemoryEvent(c as never, { namespace: "real_life", raw_text: "Project Apollo has a deadline risk and needs follow up", source: "project_update", importance: 8 }, principal, runtime({ memoryCaptureApiEnabled: true }));
    expect(result.ok).toBe(true);
    expect(c.rows.some((row) => row.table === "audit_logs" && row.action === "memory_event_captured")).toBe(true);
  });
  it("distillation creates a deterministic context pack when enabled", async () => {
    const events = [{ id: "e1", namespace: "real_life", user_id: principal.userId, source: "project_update", raw_text: "Project Apollo has a blocker and must follow up with Alice", importance: 9, status: "captured", created_by: principal.userId }];
    const pack = buildDailyContextPack("real_life", principal.userId, events as never);
    expect(pack.risks?.length).toBeGreaterThan(0);
    expect(pack.open_loops?.length).toBeGreaterThan(0);
    const result = await createContextPack(client(), pack, principal, runtime({ memoryDistillationEnabled: true }));
    expect(result.ok).toBe(true);
  });
  it("context response is compact and safety-oriented", () => {
    const response = compactContextResponse(null, [{ id: "e1", namespace: "real_life", user_id: principal.userId, source: "operator_note", raw_text: "Alice owns the launch follow up", status: "captured", created_by: principal.userId }] as never, { include_people: true });
    expect(response.summary).toContain("Alice owns");
    expect(response.operating_rules.join(" ")).toContain("Do not invent");
  });
  it("OpenAPI schema exists and includes bearer auth", () => {
    const schema = JSON.parse(readFileSync("public/pandora-memory-openapi.json", "utf8"));
    expect(schema.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
    expect(schema.paths["/api/memory/context"].post.operationId).toBe("getMemoryContext");
  });
  it("bridge code avoids model, embedding, semantic retrieval, and MCP imports", () => {
    const source = readFileSync("lib/services/memory-distillation-service.ts", "utf8");
    expect(source).not.toMatch(/openai|embedding|semantic|mcp|model/i);
  });
});
