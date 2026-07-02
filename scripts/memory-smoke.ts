import { createClient } from "@supabase/supabase-js";
import { getPandoraMcpDbKey, getPandoraSupabaseUrl, presentEnvName } from "../lib/services/pandora-mcp-env";
import { analyzeMemoryCandidatesTool, captureAdaptiveMemoryTool, captureMemoryEventTool, createSessionDigestTool, distillContextPackTool, getAdaptiveContextTool, getLatestContextPackTool, getMemoryContextTool, getOpenLoopsTool } from "../lib/services/pandora-mcp-tools";
import type { MemoryBridgeDbClient } from "../lib/services/memory-bridge-service";

const seed = "Creative workflow preference: preserve continuity and user feedback for future writing.";
const ns = (process.env.PANDORA_MEMORY_SMOKE_NAMESPACE === "au" ? "au" : "real_life") as "real_life" | "au";
const userId = process.env.PANDORA_MCP_USER_ID ?? process.env.PANDORA_MEMORY_BRIDGE_USER_ID ?? "";
const env = process.env;
const required = ["PANDORA_ENABLE_MCP", "PANDORA_ENABLE_MCP_CAPTURE", "PANDORA_ENABLE_MCP_DISTILLATION", "PANDORA_ENABLE_EMBEDDINGS", "PANDORA_ENABLE_MODEL_CALLS", "PANDORA_ENABLE_SEMANTIC_RETRIEVAL", "OPENAI_API_KEY", "EMBEDDING_MODEL", "LLM_MODEL", "PANDORA_EMBEDDING_MODEL", "PANDORA_MEMORY_EMBEDDING_MODEL"];
const aliases = { apiKey: ["PANDORA_MCP_TOKEN", "PANDORA_MCP_API_KEY", "PANDORA_API_KEY", "MEMORY_API_KEY"], dbKey: ["PANDORA_MCP_DB_KEY", "PANDORA_MEMORY_BRIDGE_DB_KEY", "SUPABASE_SERVICE_ROLE_KEY"], url: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"], anon: ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] };
function flag(name: string) { return env[name] === "true" ? "enabled" : "disabled"; }
function out(name: string, ok: boolean, detail = "") { console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`); if (!ok) process.exitCode = 1; }
async function step(name: string, fn: () => Promise<unknown>, optional = false) { try { const r = await fn(); const text = JSON.stringify(r); const blocked = text.includes('"ok":false') || text.includes('Invalid API key'); out(name, optional || !blocked, text.slice(0, 500)); } catch (e) { out(name, false, e instanceof Error ? e.message : String(e)); } }
async function main() {
  console.log("Pandora memory diagnostics (secret values redacted)");
  for (const k of required) console.log(`ENV ${k}: ${env[k] ? "present" : "missing"}${k.startsWith("PANDORA_ENABLE") ? ` (${flag(k)})` : ""}`);
  for (const [label, names] of Object.entries(aliases)) console.log(`ENV ${label}: ${presentEnvName(env, names) ?? "missing"}`);
  console.log(`provider: ${env.OPENAI_API_KEY ? "openai_configured" : "deterministic/no_provider"}`);
  console.log(`distillation: ${flag("PANDORA_ENABLE_MCP_DISTILLATION")}; embeddings: ${flag("PANDORA_ENABLE_EMBEDDINGS")}; model_calls: ${flag("PANDORA_ENABLE_MODEL_CALLS")}`);
  const url = getPandoraSupabaseUrl(env); const db = getPandoraMcpDbKey(env);
  if (!url.ok || !db.ok || !userId) { out("bootstrap", false, [!url.ok && url.message, !db.ok && db.message, !userId && "Missing server env: PANDORA_MCP_USER_ID or PANDORA_MEMORY_BRIDGE_USER_ID"].filter(Boolean).join("; ")); return; }
  const client = createClient(url.value, db.value, { auth: { autoRefreshToken: false, persistSession: false } }) as unknown as MemoryBridgeDbClient;
  const principal = { ok: true as const, authType: "mcp_bearer_token" as const, userId };
  await step("supabase connection/service-role memory table read", async () => client.from("memory_events").select("id").eq("user_id", userId).eq("namespace", ns).limit(1));
  await step("analyze_memory_candidates", async () => analyzeMemoryCandidatesTool(client, principal, { namespace: ns, text: seed, source: "memory_smoke", mode: "candidate_only" }, env));
  await step("capture_adaptive_memory candidate_only", async () => captureAdaptiveMemoryTool(client, principal, { namespace: ns, text: seed, source: "memory_smoke", mode: "candidate_only" }, env));
  await step("capture_adaptive_memory auto_capture_allowed", async () => captureAdaptiveMemoryTool(client, principal, { namespace: ns, text: seed, source: "memory_smoke", mode: "auto_capture_allowed" }, env));
  await step("capture_memory_event", async () => captureMemoryEventTool(client, principal, { namespace: ns, raw_text: seed, source: "memory_smoke", sensitivity: "low" }, env), env.PANDORA_ENABLE_MCP_CAPTURE !== "true");
  await step("get_memory_context", async () => getMemoryContextTool(client, principal, { namespace: ns, query: seed, max_items: 5 }));
  await step("get_adaptive_context", async () => getAdaptiveContextTool(client, principal, { namespace: ns, query: seed, max_items: 5 }));
  await step("create_session_digest", async () => createSessionDigestTool(client, principal, { namespace: ns, source: "memory_smoke", transcript_or_summary: seed }, env), env.PANDORA_ENABLE_MCP_CAPTURE !== "true" || env.PANDORA_ENABLE_MCP_DISTILLATION !== "true");
  await step("get_latest_context_pack", async () => getLatestContextPackTool(client, principal, { namespace: ns }));
  await step("distill master context pack", async () => distillContextPackTool(client, principal, { namespace: ns, pack_type: "master" }, env), env.PANDORA_ENABLE_MCP_DISTILLATION !== "true");
  await step("retrieve open loops", async () => getOpenLoopsTool(client, principal, { namespace: ns }));
}
main().catch((e) => { out("memory smoke", false, e instanceof Error ? e.message : String(e)); });
