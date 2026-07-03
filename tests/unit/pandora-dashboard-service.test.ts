/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { loadPandoraDashboardData } from "@/lib/services/pandora-dashboard-service";

type Row = Record<string, any>;

function makeClient(store: Record<string, Row[]>, failTables: string[] = []) {
  return {
    from(table: string) {
      if (failTables.includes(table)) throw new Error("table missing");
      const eqs: Record<string, any> = {};
      let limitN: number | undefined;
      let orderBy: string | undefined;
      const rows = () => {
        let filtered = (store[table] ?? []).filter((row) => Object.entries(eqs).every(([key, value]) => row[key] === value));
        if (orderBy) filtered = [...filtered].sort((a, b) => String(b[orderBy!] ?? "").localeCompare(String(a[orderBy!] ?? "")));
        return limitN == null ? filtered : filtered.slice(0, limitN);
      };
      const builder: any = {
        select() { return builder; },
        eq(column: string, value: any) { eqs[column] = value; return builder; },
        order(column: string) { orderBy = column; return builder; },
        limit(count: number) { limitN = count; return builder; },
        then(resolve: any, reject: any) { return Promise.resolve({ data: rows(), error: null }).then(resolve, reject); },
      };
      return builder;
    },
  } as any;
}

const USER = "64110799-da61-445d-a7b3-57f3d0c7e411";
const OTHER = "83a07d75-6b1f-4d93-aded-65540c9f73f2";

function baseStore(): Record<string, Row[]> {
  return {
    memory_events: [
      { id: "rl-1", user_id: USER, namespace: "real_life", status: "captured", raw_text: "real life only", created_at: "2026-07-03T10:00:00Z" },
      { id: "au-1", user_id: USER, namespace: "au", status: "reviewed", raw_text: "au only", created_at: "2026-07-03T11:00:00Z" },
      { id: "other-1", user_id: OTHER, namespace: "real_life", status: "captured", raw_text: "other user", created_at: "2026-07-03T12:00:00Z" },
    ],
    memory_context_packs: [
      { id: "rl-pack", user_id: USER, namespace: "real_life", pack_type: "master", status: "active", title: "real master", active_projects: [{ id: "p" }], people_map: [], created_at: "2026-07-03T10:00:00Z" },
      { id: "au-pack", user_id: USER, namespace: "au", pack_type: "master", status: "active", title: "au master", active_projects: [], people_map: [{ name: "Known" }], created_at: "2026-07-03T11:00:00Z" },
      { id: "other-pack", user_id: OTHER, namespace: "real_life", pack_type: "master", status: "active", title: "other", created_at: "2026-07-03T12:00:00Z" },
    ],
    memory_profiles: [
      { id: "profile", user_id: USER, namespace: "real_life", profile_type: "operating_profile", subject_key: "global", status: "active", title: "Operator", summary: "Live profile", confidence: 0.77, preferences: [{ text: "Use truth boundaries" }], updated_at: "2026-07-03T12:00:00Z" },
    ],
    memory_open_loops: [{ id: "loop", user_id: USER, namespace: "real_life", status: "open" }],
    memory_capture_candidates: [{ id: "cand", user_id: USER, namespace: "real_life", status: "pending", requires_review: true }],
    memory_review_queue_items: [],
    memory_pruning_candidates: [],
  };
}

describe("loadPandoraDashboardData", () => {
  it("loads only the authenticated user and keeps AU / real_life separated", async () => {
    const data = await loadPandoraDashboardData(makeClient(baseStore()), { userId: USER, operatorLabel: "operator@example.com" });
    expect(data.operatorLabel).toBe("operator@example.com");
    expect(data.memorySpaces.find((space) => space.id === "real_life")?.memories).toBe(1);
    expect(data.memorySpaces.find((space) => space.id === "au")?.memories).toBe(1);
    expect(data.memorySpaces.find((space) => space.id === "real_life")?.description).toContain("real master");
    expect(data.memorySpaces.find((space) => space.id === "au")?.description).toContain("au master");
    expect(JSON.stringify(data)).not.toContain("other user");
    expect(JSON.stringify(data)).not.toContain(OTHER);
  });

  it("does not fabricate retrieval accuracy or fake operational counts", async () => {
    const data = await loadPandoraDashboardData(makeClient(baseStore()), { userId: USER });
    const retrieval = data.stats.find((stat) => stat.id === "retrieval");
    expect(retrieval?.value).toBe("Gated");
    expect(JSON.stringify(data)).not.toContain("94.3");
    expect(JSON.stringify(data)).not.toContain("retrieval accuracy");
  });

  it("surfaces active master duplicates as diagnostics and work queue attention", async () => {
    const store = baseStore();
    store.memory_context_packs.push({ id: "rl-dup", user_id: USER, namespace: "real_life", pack_type: "master", status: "active", title: "duplicate", created_at: "2026-07-03T12:30:00Z" });
    const data = await loadPandoraDashboardData(makeClient(store), { userId: USER });
    expect(data.workQueue.packSupersessionNeeded).toBe(1);
    expect(data.diagnostics.coreSystems.find((row) => row.label === "Master-pack invariant")?.state).toBe("attention");
    expect(data.stats.find((stat) => stat.id === "packs")?.subtitle).toContain("duplicate");
  });

  it("returns warnings and safe empty dashboard when table reads fail", async () => {
    const data = await loadPandoraDashboardData(makeClient({}, ["memory_events", "memory_context_packs", "memory_profiles", "memory_open_loops", "memory_capture_candidates", "memory_review_queue_items", "memory_pruning_candidates"]), { userId: USER });
    expect(data.warnings.length).toBeGreaterThan(0);
    expect(data.memorySpaces.find((space) => space.id === "real_life")?.memories).toBe(0);
    expect(data.timelineEvents).toEqual([]);
    expect(data.diagnostics.coreSystems.find((row) => row.label === "Displayed data")?.state).toBe("attention");
  });

  it.each([
    [null, "N/A", 0],
    [0.77, "77%", 77],
    [77, "77%", 77],
    ["invalid", "N/A", 0],
  ])("formats profile confidence safely for %s", async (confidence, label, percent) => {
    const store = baseStore();
    store.memory_profiles[0].confidence = confidence;
    const data = await loadPandoraDashboardData(makeClient(store), { userId: USER });
    expect(data.profileSnapshot.confidenceLabel).toBe(label);
    expect(data.profileSnapshot.confidencePercent).toBe(percent);
  });

  it("handles null timeline summaries safely", async () => {
    const store = baseStore();
    store.memory_events[0].raw_text = null;
    store.memory_events[0].extracted_summary = null;
    const data = await loadPandoraDashboardData(makeClient(store), { userId: USER });
    expect(data.timelineEvents.find((event) => event.id === "rl-1")?.desc).toBe("No summary returned for this live row.");
  });
});
