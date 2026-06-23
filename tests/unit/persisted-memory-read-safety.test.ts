import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = [
  "app/api/memory/items/route.ts",
  "app/api/memory/items/[id]/route.ts",
  "app/api/memory/sources/route.ts",
  "app/api/memory/sources/[id]/route.ts",
  "app/api/memory/items/[id]/patches/route.ts",
  "app/api/memory/items/[id]/audit/route.ts",
];

describe("persisted memory read safety boundaries", () => {
  it("has no service-role imports in public routes", () => { for (const f of files) expect(readFileSync(join(root, f), "utf8")).not.toMatch(/service-role|serviceRole|SUPABASE_SERVICE_ROLE/i); });
  it("has no OpenAI/model/retrieval/vector/pgvector/GPT Actions/MCP imports", () => { const text = ["lib/db/supabase-persisted-memory-read-repository.ts", "lib/api/persisted-memory-read-route-handler.ts", ...files].map((f) => readFileSync(join(root, f), "utf8")).join("\n"); expect(text).not.toMatch(/openai|anthropic|model provider|retrieval-service|pgvector|embedding|GPT Actions|MCP/i); });
  it("/api/memory/ingest remains production-disabled", () => { const route = readFileSync(join(root, "app/api/memory/ingest/route.ts"), "utf8"); const handler = readFileSync(join(root, "lib/api/memory-ingest-route-handler.ts"), "utf8"); expect(`${route}\n${handler}`).toMatch(/productionWriteDisabled|production-disabled|disabled/i); });
  it("persistence executor remains internal/admin-gated", () => { const route = readFileSync(join(root, "app/api/admin/memory/persistence/review/[id]/execute/route.ts"), "utf8"); expect(route).toMatch(/admin|internal|persistence/i); });
});
