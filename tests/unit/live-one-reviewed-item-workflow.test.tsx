import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import { join } from "path";
import { createLiveOneReviewedItemWorkflowRouteHandler } from "@/lib/api/live-one-reviewed-item-workflow-route-handler";
import Page from "@/app/admin/memory/live-one-item/page";

const sessionResult = { ok: true, session: { userId: "u1", authenticated: true, allowedNamespaces: ["real_life"], adminCapabilities: ["memory:manual-workflow"], isInternalOperator: true, isPersistenceOperator: true } } as never;

describe("live one reviewed item workflow route", () => {
  it("is disabled by default and rejects client identity", async () => {
    const h = createLiveOneReviewedItemWorkflowRouteHandler();
    expect((await h.GET()).status).toBe(200);
    expect((await h.POST(new NextRequest("https://x", { method: "POST", body: "{}" }))).status).toBe(501);
    const badUser = await createLiveOneReviewedItemWorkflowRouteHandler({ enabled: true }).POST(new NextRequest("https://x", { method: "POST", body: JSON.stringify({ user_id: "evil" }) }));
    expect(badUser.status).toBe(400);
  });

  it("reports missing dependencies when old injected path is enabled without wiring", async () => {
    const res = await createLiveOneReviewedItemWorkflowRouteHandler({ enabled: true, resolveSession: async () => sessionResult, env: () => ({ PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE: "true", PANDORA_ENABLE_ADMIN_PERSISTENCE_CONSOLE: "true" }) as never }).POST(new NextRequest("https://x", { method: "POST", body: JSON.stringify({ namespace: "real_life", reviewItemId: "r1", decisionId: "d1", idempotencyKey: "idem-1234", typedConfirmation: "APPEND MEMORY" }) }));
    expect(res.status).toBe(501);
    expect((await res.json()).blockers).toContain("missing_internal_dependencies");
  });

  it("keeps the direct proof path gated and the UI safe", () => {
    const html = renderToStaticMarkup(<Page />);
    for (const copy of ["Live one-item memory workflow", "Internal operator workflow", "One approved review item only", "Public persistence is disabled", "Production ingest writes are disabled", "Execution requires typed confirmation: APPEND MEMORY"]) expect(html).toContain(copy);
    const routeHandler = readFileSync(join(process.cwd(), "lib/api/live-one-reviewed-item-workflow-route-handler.ts"), "utf8");
    const directExecutor = readFileSync(join(process.cwd(), "lib/services/first-live-append-direct-proof-executor.ts"), "utf8");
    expect(routeHandler).toMatch(/PANDORA_ENABLE_ONE_ITEM_PROOF_EXECUTOR/);
    expect(directExecutor).toMatch(/x-pandora-internal-operator-token/);
  });
});
