import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const files = ["components/pandora/OperatorActionCenterCard.tsx", "components/pandora/OperatorActionComposer.tsx", "components/pandora/OperatorActionList.tsx", "components/pandora/OperatorActionEnvelope.tsx", "components/pandora/OperatorActionControls.tsx", "components/pandora/OperatorActionTimeline.tsx", "components/pandora/ShadowContextPackLabCard.tsx", "components/pandora/ShadowContextPackControls.tsx", "components/pandora/ShadowContextPackDetail.tsx", "components/pandora/PromotionRequestBoardCard.tsx", "components/pandora/PromotionRequestList.tsx", "components/pandora/PromotionRequestControls.tsx", "components/pandora/PromotionRequestReviewForm.tsx"];
describe("operator action center safety guards", () => {
  it("does not render dangerous live action buttons", () => { const text = files.map((f)=>readFileSync(f,"utf8")).join("\n"); for (const bad of ["Promote live", "Replace master", "Execute promotion", "Delete memory", "Prune now", "Merge now", "Distill now"]) expect(text).not.toContain(bad); });
  it("service does not import service-role/admin clients or mutate core memory tables", () => { const text=readFileSync("lib/services/pandora-operator-action-service.ts","utf8")+readFileSync("lib/services/pandora-shadow-context-pack-service.ts","utf8")+readFileSync("lib/services/pandora-promotion-request-service.ts","utf8"); expect(text).not.toContain("service-role"); expect(text).not.toContain("createSupabaseBridgeAdminClient"); expect(text).not.toContain(".delete("); for (const table of ["memory_events","memory_context_packs","memory_profiles","memory_capture_candidates","memory_pruning_candidates"]) expect(text).not.toMatch(new RegExp(`from\\(\\\"${table}\\\"\\).*\\.(insert|update|delete)`)); expect(text).toContain("no_core_memory_mutation_performed: true"); });
  it("production pandora path does not import mock-data and route identity rejects client user ids", () => { expect(readFileSync("app/pandora/page.tsx","utf8")).not.toContain("mock-data"); const route=readFileSync("app/api/pandora/operator-actions/route.ts","utf8")+readFileSync("app/api/pandora/shadow-context-packs/route.ts","utf8")+readFileSync("app/api/pandora/shadow-context-packs/[id]/review/route.ts","utf8")+readFileSync("app/api/pandora/promotion-requests/route.ts","utf8")+readFileSync("app/api/pandora/promotion-requests/[id]/review/route.ts","utf8"); expect(route).toContain("assertNoClientUserIdOverride"); expect(route).not.toContain("searchParams.get(\"user_id\")"); expect(route).not.toContain("body.user_id"); });
  it("promotion execution exists only behind the env gate + confirmation phrase, and never deletes", () => {
    // The un-gated legacy execution paths must never exist.
    for (const route of ["app/api/pandora/promotion-requests/[id]/execute/route.ts", "app/api/pandora/promotion-requests/[id]/promote/route.ts"]) expect(existsSync(route)).toBe(false);
    // The gated executor (promotion executor v1) must enforce the gate and confirmation phrases,
    // must not use service-role/admin clients, must never call .delete(, and may write only
    // memory_context_packs among core memory tables (status-only promotion/rollback).
    const svc = readFileSync("lib/services/pandora-promotion-execution-service.ts", "utf8");
    expect(svc).toContain("PANDORA_ENABLE_CONTEXT_PACK_PROMOTION");
    expect(svc).toContain('PROMOTE_CONFIRMATION = "PROMOTE"');
    expect(svc).toContain('ROLLBACK_CONFIRMATION = "ROLLBACK"');
    expect(svc).not.toContain("service-role");
    expect(svc).not.toContain("createSupabaseBridgeAdminClient");
    expect(svc).not.toContain(".delete(");
    for (const table of ["memory_events", "memory_items", "memory_profiles", "memory_capture_candidates", "memory_pruning_candidates"]) expect(svc).not.toMatch(new RegExp(`from\\(\\"${table}\\"\\)`));
    // Execution routes must derive identity server-side and reject client user ids.
    const routes = readFileSync("app/api/pandora/promotion-requests/[id]/execution/route.ts", "utf8") + readFileSync("app/api/pandora/promotion-requests/[id]/execution/dry-run/route.ts", "utf8") + readFileSync("app/api/pandora/promotion-executions/[id]/rollback/route.ts", "utf8");
    expect(routes).toContain("assertNoClientUserIdOverride");
    expect(routes).not.toContain("body.user_id");
  });
  it("retrieval eval still has no fabricated accuracy", () => { const text=readFileSync("lib/services/pandora-verification-service.ts","utf8")+readFileSync("lib/services/pandora-dashboard-service.ts","utf8"); expect(text).not.toContain("94.3"); expect(text).not.toContain("fake accuracy"); expect(text).not.toContain("retrieval accuracy: 100%"); });
});
