/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { dryRunPromotionExecution, executeApprovedPromotion, rollbackPromotionExecution, PROMOTION_EXECUTION_GATE } from "@/lib/services/pandora-promotion-execution-service";

const USER = "11111111-1111-4111-8111-111111111111";
type Row = Record<string, any>;
type Store = Record<string, Row[]>;

// In-memory client: eq/neq-filtered reads, inserts append, updates patch every matching row.
function client(store: Store, ops: any[] = []) {
  return { from(table: string) {
    const eqs: Record<string, any> = {}; const neqs: Record<string, any> = {}; let lim = Infinity; let mode: "select" | "insert" | "update" = "select"; let patch: Row | null = null; let inserted: Row[] = [];
    const src = () => (store[table] ??= []);
    const matches = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v) && Object.entries(neqs).every(([k, v]) => r[k] !== v);
    const rows = () => src().filter(matches).slice(0, lim);
    const b: any = {
      select() { return b; }, order() { return b; }, single() { return b; },
      eq(k: string, v: any) { eqs[k] = v; return b; }, neq(k: string, v: any) { neqs[k] = v; return b; }, limit(n: number) { lim = n; return b; },
      insert(value: Row | Row[]) { mode = "insert"; inserted = Array.isArray(value) ? value : [value]; return b; },
      update(value: Row) { mode = "update"; patch = value; return b; },
      then(res: any, rej: any) {
        if (mode === "insert") { src().push(...inserted); return Promise.resolve({ data: inserted, error: null }).then(res, rej); }
        if (mode === "update") { const affected = rows(); for (const r of affected) Object.assign(r, patch); ops.push({ table, patch, eqs: { ...eqs }, neqs: { ...neqs }, ids: affected.map((r) => r.id) }); return Promise.resolve({ data: affected, error: null }).then(res, rej); }
        return Promise.resolve({ data: rows(), error: null }).then(res, rej);
      },
    };
    return b;
  } } as any;
}

function store(overrides: { requestStatus?: string; reviewerDecision?: string | null; requestMasterId?: string | null; liveMaster?: boolean } = {}): Store {
  const { requestStatus = "approved", reviewerDecision = "approved", requestMasterId = "m1", liveMaster = true } = overrides;
  return {
    pandora_shadow_context_packs: [{ id: "s1", user_id: USER, request_id: "req", namespace: "real_life", pack_type: "master_candidate", status: "reviewed", title: "Shadow RL", summary: "shadow summary", source_window: {}, candidate_payload: { title: "Promoted RL master", summary: "promoted summary", key_points: ["kp"], active_projects: [], people_map: [], decisions: [], risks: [], open_loops: [], generated_from_event_ids: ["e1"] }, evidence: {}, warnings: [], created_at: "2026-01-01", updated_at: "2026-01-01" }],
    pandora_shadow_pack_preflights: [{ id: "p1", user_id: USER, shadow_pack_id: "s1", namespace: "real_life", active_master_pack_id: "m1", request_id: "pre", status: "approved_for_promotion", diff_summary: { has_active_master: true }, risk_summary: { status: "low", score: 10, reasons: [], blockers: [], warnings: [] }, reviewer_notes: "", reviewer_decision: "approved_for_promotion", warnings: [], created_at: "2026-01-01", updated_at: "2026-01-01" }],
    pandora_promotion_requests: [{ id: "r1", user_id: USER, request_id: "req-1", namespace: "real_life", shadow_pack_id: "s1", preflight_id: "p1", active_master_pack_id: requestMasterId, status: requestStatus, title: "t", summary: "s", promotion_plan: {}, rollback_plan: {}, risk_snapshot: {}, diff_snapshot: {}, reviewer_notes: "", reviewer_decision: reviewerDecision, warnings: [], created_at: "2026-01-01", updated_at: "2026-01-01" }],
    pandora_promotion_request_events: [], pandora_promotion_executions: [], pandora_promotion_execution_events: [],
    memory_context_packs: [
      ...(liveMaster ? [{ id: "m1", user_id: USER, namespace: "real_life", pack_type: "master", status: "active", title: "old master", summary: "old" }] : []),
      { id: "au-m", user_id: USER, namespace: "au", pack_type: "master", status: "active", title: "au master", summary: "au" },
    ],
    memory_events: [], memory_profiles: [], memory_capture_candidates: [], memory_pruning_candidates: [], audit_logs: [],
  };
}

const gateOn = { [PROMOTION_EXECUTION_GATE]: "true" } as any;
const gateOff = {} as any;

describe("promotion execution service", () => {
  it("gate defaults off: execute and rollback refuse and mutate nothing", async () => {
    const s = store();
    await expect(executeApprovedPromotion(client(s), { userId: USER, promotionRequestId: "r1", confirmation: "PROMOTE" }, gateOff)).rejects.toThrow(/promotion_execution_disabled/);
    await expect(rollbackPromotionExecution(client(s), { userId: USER, executionId: "x", confirmation: "ROLLBACK" }, gateOff)).rejects.toThrow(/promotion_execution_disabled/);
    expect(s.memory_context_packs.filter((p) => p.status === "active")).toHaveLength(2);
    expect(s.pandora_promotion_executions).toHaveLength(0);
  });

  it("requires the explicit confirmation phrase even with the gate on", async () => {
    const s = store();
    await expect(executeApprovedPromotion(client(s), { userId: USER, promotionRequestId: "r1", confirmation: "yes" }, gateOn)).rejects.toThrow(/confirmation phrase/);
    expect(s.memory_context_packs).toHaveLength(2);
    expect(s.pandora_promotion_executions).toHaveLength(0);
  });

  it("dry run computes an executable plan without writing anything", async () => {
    const s = store();
    const before = JSON.stringify(s.memory_context_packs);
    const dry = await dryRunPromotionExecution(client(s), { userId: USER, promotionRequestId: "r1" }, gateOff);
    expect(dry.blockers).toHaveLength(0);
    expect(dry.gate_enabled).toBe(false);
    expect(dry.executable).toBe(false); // plan is clean but the gate is off
    expect((dry.plan as any).status_only).toBe(true);
    expect(JSON.stringify(s.memory_context_packs)).toBe(before);
    expect(s.pandora_promotion_executions).toHaveLength(0);
    expect(s.audit_logs).toHaveLength(0);
  });

  it("executes an approved promotion: new master from candidate, old archived, request promoted, audit written", async () => {
    const s = store();
    const execution = await executeApprovedPromotion(client(s), { userId: USER, promotionRequestId: "r1", confirmation: "PROMOTE" }, gateOn);
    expect(execution.status).toBe("executed");
    expect(execution.previous_master_pack_id).toBe("m1");
    const rlMasters = s.memory_context_packs.filter((p) => p.namespace === "real_life" && p.pack_type === "master");
    const active = rlMasters.filter((p) => p.status === "active");
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(execution.promoted_pack_id);
    expect(active[0].title).toBe("Promoted RL master");
    expect(s.memory_context_packs.find((p) => p.id === "m1")!.status).toBe("archived"); // archived, not deleted
    expect(s.memory_context_packs.find((p) => p.id === "au-m")!.status).toBe("active"); // other namespace untouched
    expect(s.pandora_promotion_requests[0].status).toBe("promoted");
    expect(s.pandora_promotion_execution_events.map((e) => e.event_type)).toContain("promotion_executed");
    expect(s.audit_logs.map((a) => a.action)).toContain("memory_context_pack_promoted");
    expect(s.memory_events).toHaveLength(0);
    expect(s.memory_profiles).toHaveLength(0);
  });

  it("blocks execution when the request is not approved, recording a blocked execution row", async () => {
    const s = store({ requestStatus: "submitted", reviewerDecision: null });
    await expect(executeApprovedPromotion(client(s), { userId: USER, promotionRequestId: "r1", confirmation: "PROMOTE" }, gateOn)).rejects.toThrow(/blocked/);
    expect(s.memory_context_packs.filter((p) => p.status === "active")).toHaveLength(2);
    expect(s.pandora_promotion_executions).toHaveLength(1);
    expect(s.pandora_promotion_executions[0].status).toBe("blocked");
  });

  it("blocks execution when the active master changed since approval", async () => {
    const s = store();
    s.memory_context_packs.find((p) => p.id === "m1")!.status = "archived";
    s.memory_context_packs.push({ id: "m2", user_id: USER, namespace: "real_life", pack_type: "master", status: "active", title: "newer", summary: "n" });
    await expect(executeApprovedPromotion(client(s), { userId: USER, promotionRequestId: "r1", confirmation: "PROMOTE" }, gateOn)).rejects.toThrow(/Active master changed/);
    expect(s.memory_context_packs.find((p) => p.id === "m2")!.status).toBe("active");
  });

  it("rolls back an executed promotion: promoted archived, previous master restored", async () => {
    const s = store();
    const c = client(s);
    const execution = await executeApprovedPromotion(c, { userId: USER, promotionRequestId: "r1", confirmation: "PROMOTE" }, gateOn);
    const rolledBack = await rollbackPromotionExecution(c, { userId: USER, executionId: execution.id, confirmation: "ROLLBACK" }, gateOn);
    expect(rolledBack.status).toBe("rolled_back");
    expect(s.memory_context_packs.find((p) => p.id === execution.promoted_pack_id)!.status).toBe("archived");
    expect(s.memory_context_packs.find((p) => p.id === "m1")!.status).toBe("active");
    const active = s.memory_context_packs.filter((p) => p.namespace === "real_life" && p.pack_type === "master" && p.status === "active");
    expect(active).toHaveLength(1);
    expect(s.audit_logs.map((a) => a.action)).toContain("memory_context_pack_promotion_rolled_back");
    await expect(rollbackPromotionExecution(c, { userId: USER, executionId: execution.id, confirmation: "ROLLBACK" }, gateOn)).rejects.toThrow(/Only executed promotions/);
  });

  it("never deletes rows from any table it touches", async () => {
    const s = store();
    const c = client(s);
    const totalRows = () => Object.values(s).reduce((n, rows) => n + rows.length, 0);
    const before = totalRows();
    const execution = await executeApprovedPromotion(c, { userId: USER, promotionRequestId: "r1", confirmation: "PROMOTE" }, gateOn);
    await rollbackPromotionExecution(c, { userId: USER, executionId: execution.id, confirmation: "ROLLBACK" }, gateOn);
    expect(totalRows()).toBeGreaterThanOrEqual(before); // rows are only ever added or re-statused
  });
});
