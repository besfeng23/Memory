/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { getMemoryContextTool, getLatestContextPackTool } from "@/lib/services/pandora-mcp-tools";
import { buildAdaptiveChatGptContext } from "@/lib/services/adaptive-chatgpt-context-service";
import { createContextPack } from "@/lib/services/memory-bridge-service";
import { runMcpAction } from "@/lib/services/pandora-mcp-action-envelope";

// A small namespace-aware in-memory client: reads filter the store by the recorded eq/neq
// predicates, inserts assign an id, updates patch matching rows (and are recorded in `ops`).
type Row = Record<string, any>;
function makeClient(store: Record<string, Row[]>, ops: any[] = []) {
  let counter = 0;
  return {
    from(table: string) {
      const eqs: Record<string, any> = {};
      const neqs: Record<string, any> = {};
      let mode: "select" | "insert" | "update" = "select";
      let inserted: Row[] = [];
      let patch: Row | null = null;
      let limitN: number | undefined;
      const src = () => (store[table] ??= []);
      const matches = (row: Row) =>
        Object.entries(eqs).every(([k, v]) => row[k] === v) && Object.entries(neqs).every(([k, v]) => row[k] !== v);
      const rows = () => {
        const filtered = src().filter(matches);
        return limitN != null ? filtered.slice(0, limitN) : filtered;
      };
      const builder: any = {
        select() { return builder; },
        insert(value: Row | Row[]) { mode = "insert"; inserted = (Array.isArray(value) ? value : [value]).map((r) => ({ id: r.id ?? `gen-${++counter}`, ...r })); return builder; },
        update(value: Row) { mode = "update"; patch = value; return builder; },
        eq(col: string, val: any) { eqs[col] = val; return builder; },
        neq(col: string, val: any) { neqs[col] = val; return builder; },
        order() { return builder; },
        limit(n: number) { limitN = n; return builder; },
        single() {
          if (mode === "insert") { src().push(...inserted); return Promise.resolve({ data: inserted[0] ?? null, error: null }); }
          return Promise.resolve({ data: rows()[0] ?? null, error: null });
        },
        then(resolve: any, reject: any) {
          let data: any;
          if (mode === "insert") { src().push(...inserted); data = inserted; }
          else if (mode === "update") {
            const affected = src().filter(matches);
            for (const row of affected) Object.assign(row, patch);
            ops.push({ table, patch, eqs: { ...eqs }, neqs: { ...neqs }, affected: affected.map((r) => r.id) });
            data = affected;
          } else data = rows();
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  } as any;
}

const USER = "u-64110799";
const mcpPrincipal = { ok: true as const, authType: "mcp_bearer_token" as const, userId: USER };

function pack(namespace: string, extra: Row = {}): Row {
  return { id: `pack-${namespace}`, user_id: USER, namespace, pack_type: "master", status: "active", title: "Pandora master context pack", summary: "", key_points: [], active_projects: [], people_map: [], decisions: [], risks: [], open_loops: [], generated_from_event_ids: [], created_at: "2026-07-03T00:00:00Z", ...extra };
}
function evt(namespace: string, id: string, raw_text: string): Row {
  return { id, user_id: USER, namespace, source: "chatgpt_user_direct", raw_text, extracted_summary: raw_text, status: "captured", importance: 8, sensitivity: "low", created_at: "2026-07-03T00:00:00Z" };
}

function seededStore(): Record<string, Row[]> {
  return {
    memory_context_packs: [
      pack("au", { summary: "AU FICTIONALIZATION RULE — Janine Tan / Mang Jun canon", key_points: [{ point: "AU CONSENT / FICTIONALIZATION RULE — Janine Tan", event_id: "au1", source: "chatgpt_user_direct", importance: 10 }] }),
      pack("real_life", { summary: "PANDORA MEMORY ROADMAP + PLP Pueblo La Perla Boracay", key_points: [{ point: "PANDORA MEMORY ROADMAP — user asked to save", event_id: "rl1", source: "chatgpt_user_direct", importance: 9 }] }),
    ],
    memory_events: [
      evt("au", "au1", "AU FICTIONALIZATION RULE — Janine Tan is a fictionalized character; Mang Jun archetype."),
      evt("real_life", "rl1", "PANDORA MEMORY ROADMAP — user asked to save. PLP Pueblo La Perla Boracay resort project status."),
    ],
    memory_profiles: [],
    memory_open_loops: [],
  };
}

describe("retrieval eval (#11)", () => {
  it("AU query returns AU context and excludes real_life/PLP content", async () => {
    const result = await getMemoryContextTool(makeClient(seededStore()), mcpPrincipal, { namespace: "au" });
    const text = JSON.stringify(result);
    expect(result.namespace).toBe("au");
    expect(text).toContain("Janine");
    expect(text).toContain("FICTIONALIZATION"); // AU canon retrievable from AU
    expect(text).not.toMatch(/PLP|Pueblo|ROADMAP/);
  });

  it("real_life query returns Pandora/PLP context and excludes AU story content", async () => {
    const result = await getMemoryContextTool(makeClient(seededStore()), mcpPrincipal, { namespace: "real_life" });
    const text = JSON.stringify(result);
    expect(result.namespace).toBe("real_life");
    expect(text).toContain("ROADMAP"); // roadmap retrievable from real_life
    expect(text).toMatch(/PLP|Pueblo/);
    expect(text).not.toContain("Janine");
  });

  it("routing through the MCP boundary adds controlled envelope fields", async () => {
    const client = makeClient(seededStore());
    const content = await runMcpAction(() => getMemoryContextTool(client, mcpPrincipal, { namespace: "au" }));
    const body = JSON.parse(content.content[0].text); // must be valid JSON
    expect(body.ok).toBe(true);
    expect(body.request_id).toMatch(/^req_/);
    expect(body.fallback_used).toBe(false);
    expect(body.namespace).toBe("au");
  });

  it("falls back to latest context pack (fallback_used=true) when the primary read fails", async () => {
    const client = makeClient(seededStore());
    const content = await runMcpAction(
      () => Promise.reject(new Error("context_read_failed: primary down")),
      { fallback: () => getLatestContextPackTool(client, mcpPrincipal, { namespace: "au" }) },
    );
    const body = JSON.parse(content.content[0].text);
    expect(body.ok).toBe(true);
    expect(body.fallback_used).toBe(true);
    expect(body.warnings).toContain("primary_failed:context_read_failed");
    expect(JSON.stringify(body)).not.toContain("Pueblo"); // still AU-scoped
  });

  it("caps the context payload (no giant/stream-breaking response)", async () => {
    const store = seededStore();
    store.memory_context_packs[0].people_map = [{ name: "Janine Tan", event_ids: Array.from({ length: 800 }, (_, i) => `au-evt-${i}`), notes: ["n"] }];
    const result: any = await getMemoryContextTool(makeClient(store), mcpPrincipal, { namespace: "au" });
    expect(JSON.stringify(result.context_pack).length).toBeLessThanOrEqual(12000);
  });

  it("adaptive context surfaces the refreshed operating profile (summary/confidence/preferences)", async () => {
    const store = seededStore();
    store.memory_profiles = [{
      id: "prof-au", user_id: USER, namespace: "au", profile_type: "operating_profile", subject_key: "global", status: "active",
      summary: "Adaptive au operating profile from 11 memories: 6 preferences", confidence: 0.88,
      preferences: [{ text: "AU FICTIONALIZATION RULE — use a fictional alias", event_id: "au1" }], facts: [], decisions: [],
    }];
    const ctx: any = await buildAdaptiveChatGptContext(makeClient(store), { user_id: USER, namespace: "au" });
    expect(ctx.adaptive_profile_summary).toContain("Adaptive au operating profile");
    expect(ctx.adaptive_profile_confidence).toBe(0.88);
    expect(ctx.writing_rules.join(" ")).toContain("FICTIONALIZATION");
  });
});

describe("supersede-on-distill", () => {
  const bridgePrincipal = { ok: true as const, userId: USER, createdBy: USER, authType: "bridge_token" as const, operator: true };
  const runtime = { config: { memoryCaptureApiEnabled: false, memoryContextApiEnabled: true, memoryDistillationEnabled: true }, gates: { memoryCaptureApiEnabled: { envVar: "PANDORA_ENABLE_MCP_CAPTURE" }, memoryContextApiEnabled: { envVar: "PANDORA_ENABLE_MCP" }, memoryDistillationEnabled: { envVar: "PANDORA_ENABLE_MCP_DISTILLATION" } } } as any;
  const newPack = (namespace: string) => ({ namespace, user_id: USER, pack_type: "master" as const, title: "t", summary: "s", key_points: [], active_projects: [], people_map: [], decisions: [], risks: [], open_loops: [], generated_from_event_ids: [] });

  it("archives older active master packs for the same namespace but keeps the newest active", async () => {
    const store: Record<string, Row[]> = {
      memory_context_packs: [
        { id: "au-old", user_id: USER, namespace: "au", pack_type: "master", status: "active" },
        { id: "au-daily", user_id: USER, namespace: "au", pack_type: "daily", status: "active" },
        { id: "rl-old", user_id: USER, namespace: "real_life", pack_type: "master", status: "active" },
      ],
      audit_logs: [],
    };
    const ops: any[] = [];
    const result: any = await createContextPack(makeClient(store, ops), newPack("au") as any, bridgePrincipal, runtime);
    expect(result.ok).toBe(true);

    const auMasters = store.memory_context_packs.filter((p) => p.namespace === "au" && p.pack_type === "master");
    const activeAuMasters = auMasters.filter((p) => p.status === "active");
    expect(activeAuMasters).toHaveLength(1); // exactly one active au master (the new one)
    expect(activeAuMasters[0].id).toBe(result.data.id);
    expect(store.memory_context_packs.find((p) => p.id === "au-old")!.status).toBe("archived");

    // did NOT touch other pack types or the other namespace
    expect(store.memory_context_packs.find((p) => p.id === "au-daily")!.status).toBe("active");
    expect(store.memory_context_packs.find((p) => p.id === "rl-old")!.status).toBe("active");

    // status-only archive, never a delete
    expect(store.memory_context_packs.find((p) => p.id === "au-old")).toBeDefined();
    const supersedeOp = ops.find((o) => o.table === "memory_context_packs" && o.patch?.status === "archived");
    expect(supersedeOp).toBeDefined();
    expect(supersedeOp.eqs.status).toBe("active");
    expect(supersedeOp.eqs.pack_type).toBe("master");
    expect(supersedeOp.neqs.id).toBe(result.data.id);
  });

  it("distilling real_life does not affect AU packs", async () => {
    const store: Record<string, Row[]> = {
      memory_context_packs: [
        { id: "au-keep", user_id: USER, namespace: "au", pack_type: "master", status: "active" },
        { id: "rl-old", user_id: USER, namespace: "real_life", pack_type: "master", status: "active" },
      ],
      audit_logs: [],
    };
    await createContextPack(makeClient(store), newPack("real_life") as any, bridgePrincipal, runtime);
    expect(store.memory_context_packs.find((p) => p.id === "au-keep")!.status).toBe("active");
    expect(store.memory_context_packs.find((p) => p.id === "rl-old")!.status).toBe("archived");
  });

  // Regression for the 2026-07-03 production checkpoint invariant: after repeated distills,
  // at most one active pack may exist per (user_id, namespace, pack_type), older packs must be
  // archived (never deleted), and other users' active packs must be untouched.
  it("repeated distills keep exactly one active pack per (user_id, namespace, pack_type)", async () => {
    const OTHER_USER = "u-83a07d75";
    const store: Record<string, Row[]> = {
      memory_context_packs: [
        { id: "other-rl", user_id: OTHER_USER, namespace: "real_life", pack_type: "master", status: "active" },
      ],
      audit_logs: [],
    };
    const client = makeClient(store);
    for (const namespace of ["au", "real_life"]) {
      await createContextPack(client, newPack(namespace) as any, bridgePrincipal, runtime);
      await createContextPack(client, newPack(namespace) as any, bridgePrincipal, runtime);
    }

    const activeCounts = new Map<string, number>();
    for (const p of store.memory_context_packs) {
      if (p.status !== "active") continue;
      const key = `${p.user_id}/${p.namespace}/${p.pack_type}`;
      activeCounts.set(key, (activeCounts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of activeCounts) expect(count, `active packs for ${key}`).toBe(1);

    // superseded packs are archived in place, never deleted
    expect(store.memory_context_packs.filter((p) => p.user_id === USER && p.namespace === "au")).toHaveLength(2);
    expect(store.memory_context_packs.filter((p) => p.user_id === USER && p.namespace === "real_life")).toHaveLength(2);

    // the other user's active master is untouched by this user's distills
    expect(store.memory_context_packs.find((p) => p.id === "other-rl")!.status).toBe("active");
  });
});
