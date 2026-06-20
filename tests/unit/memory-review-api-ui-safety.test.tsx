import { isValidElement } from "react";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as listGet, POST as listPost } from "@/app/api/memory/review/route";
import { GET as itemGet, POST as itemPost } from "@/app/api/memory/review/[id]/route";
import MemoryReviewPage from "@/app/memory/review/page";
import { plannedRouteContracts } from "@/lib/api/route-contracts";

const req = new NextRequest("https://pandora.test/api/memory/review", { method: "POST", body: JSON.stringify({ user_id: "attacker", action: "approve_append" }) });

describe("review API and UI safety", () => {
  it("review routes are disabled and ignore client user_id", async () => {
    for (const response of [await listGet(), await listPost(req), await itemGet(req, { params: Promise.resolve({ id: "x" }) }), await itemPost(req, { params: Promise.resolve({ id: "x" }) })]) {
      const body = await response.json();
      expect(response.status).toBe(501);
      expect(body.wouldPersist).toBe(false);
      expect(body.wouldApprove).toBe(false);
      expect(body.ignoresClientUserId).toBe(true);
    }
  });

  it("review UI page renders disabled safety shell", () => {
    const element = MemoryReviewPage();
    expect(isValidElement(element)).toBe(true);
    expect(JSON.stringify(element)).toContain("Review Queue");
    expect(JSON.stringify(element)).toContain("Production write disabled");
    expect(JSON.stringify(element)).toContain("Review only");
  });

  it("does not activate ingest or model/retrieval contracts", () => {
    expect(plannedRouteContracts.find((route) => route.path === "/api/memory/ingest")).toMatchObject({ status: "disabled_stub", mutatesMemory: false });
    const rendered = JSON.stringify(MemoryReviewPage());
    expect(rendered).not.toMatch(/OpenAI|embedding|pgvector|GPT Actions|MCP/);
  });
});
