/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { createMemoryProposal, approveMemoryProposal, persistApprovedMemoryProposal, rejectMemoryProposal } from "@/lib/services/memory-proposal-service";

const runtime = (enabled: boolean) => ({ config: { approvedReviewPersistenceEnabled: enabled, publicMemoryPersistenceEnabled: false }, gates: {} }) as never;
const session = (admin = true) => ({ ok: true, session: { userId: "00000000-0000-0000-0000-000000000001", authenticated: true, isInternalOperator: admin, adminCapabilities: admin ? ["memory:phase-4a"] : [] } }) as never;
function client() {
  const rows: Record<string, any>[] = []; const audits: Record<string, any>[] = [];
  const api = {
    from(table: string) {
      const filters: [string, any][] = []; let pendingUpdate: any = null;
      return {
        select(){ return this; },
        insert(v: any){ (table === "audit_logs" ? audits : rows).push({ id: `${table}-${rows.length + audits.length + 1}`, ...v }); return this; },
        update(v: any){ pendingUpdate = v; return this; },
        eq(k: string, v: any){ filters.push([k,v]); return this; },
        order(){ return this; },
        async single(){ const store = table === "audit_logs" ? audits : rows; const data = store.find(x => filters.every(([k,v]) => x[k] === v)) ?? store.at(-1); if (data && pendingUpdate) Object.assign(data, pendingUpdate); return { data, error: data ? null : { message: "not found" } }; }
      };
    },
    async rpc(){ const r = rows[0]; r.status = "persisted"; r.persisted_memory_id = "00000000-0000-0000-0000-000000000099"; audits.push({ action: "proposal_persisted" }); return { data: {}, error: null }; }, rows, audits
  };
  return api as never as ReturnType<typeof client> & any;
}

describe("Phase 4A memory proposal service", () => {
  it("blocks creation when unauthenticated, non-admin, or gate disabled", async () => {
    expect((await createMemoryProposal(client(), { namespace: "real_life", memory_text: "x" }, { ok: false, blockers: [] } as never, runtime(true))).ok).toBe(false);
    expect((await createMemoryProposal(client(), { namespace: "real_life", memory_text: "x" }, session(false), runtime(true))).ok).toBe(false);
    expect((await createMemoryProposal(client(), { namespace: "real_life", memory_text: "x" }, session(), runtime(false))).ok).toBe(false);
  });
  it("creates, approves, audits, persists once, and rejects invalid persist states", async () => {
    const c = client();
    expect((await createMemoryProposal(c, { namespace: "real_life", memory_text: " " }, session(), runtime(true))).ok).toBe(false);
    const created = await createMemoryProposal(c, { namespace: "real_life", memory_text: "Remember this", source_type: "manual_admin_entry" }, session(), runtime(true));
    expect(created.ok && created.data.status).toBe("pending");
    expect(c.audits.some((a: any) => a.action === "proposal_created")).toBe(true);
    const approved = await approveMemoryProposal(c, created.ok ? created.data.id : "", "reviewer", session(), runtime(true));
    expect(approved.ok && approved.data.status).toBe("approved");
    expect(c.audits.some((a: any) => a.action === "proposal_approved")).toBe(true);
    const persisted = await persistApprovedMemoryProposal(c, created.ok ? created.data.id : "", "reviewer", session(), runtime(true));
    expect(persisted.ok).toBe(true);
    expect(c.audits.some((a: any) => a.action === "proposal_persisted")).toBe(true);
    expect((await persistApprovedMemoryProposal(c, created.ok ? created.data.id : "", "reviewer", session(), runtime(true))).ok).toBe(false);
  });
  it("reject creates audit and rejected proposals cannot persist", async () => {
    const c = client(); const created = await createMemoryProposal(c, { namespace: "real_life", memory_text: "No" }, session(), runtime(true));
    const rejected = await rejectMemoryProposal(c, created.ok ? created.data.id : "", "no", "reviewer", session(), runtime(true));
    expect(rejected.ok && rejected.data.status).toBe("rejected");
    expect(c.audits.some((a: any) => a.action === "proposal_rejected")).toBe(true);
    expect((await persistApprovedMemoryProposal(c, created.ok ? created.data.id : "", "reviewer", session(), runtime(true))).ok).toBe(false);
  });
});
