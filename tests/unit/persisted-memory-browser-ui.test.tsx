import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MemoryBrowserShell } from "@/components/memory-browser/MemoryBrowserShell";
import { toBrowserSourceView, toBrowserItemView, browserSafety } from "@/lib/api/persisted-memory-browser-dto";
import { InMemoryPersistedMemoryReadRepository } from "@/lib/db/in-memory-persisted-memory-read-repository";
import { loadPersistedMemoryBrowserView } from "@/lib/services/persisted-memory-browser-loader";

const root = process.cwd();
const ctx = { userId: "u1", namespace: "real_life" as const };
function repo() { const r = new InMemoryPersistedMemoryReadRepository(); r.seed({ items: [{ id: "i1", user_id: "u1", namespace: "real_life", memory_type: "fact", title: "Coffee", body: "x".repeat(400), metadata: { review_item_id: "r1", decision_id: "d1", category: "preference" }, created_at: "2026-01-01", updated_at: "2026-01-02" }], sources: [{ id: "s1", user_id: "u1", namespace: "real_life", memory_item_id: "i1", source_type: "review", source_ref: "source-ref", excerpt: "sensitive ".repeat(80), metadata: { review_item_id: "r1", decision_id: "d1" }, created_at: "2026-01-01" }], patches: [{ id: "p1", user_id: "u1", namespace: "real_life", memory_item_id: "i1", patch_type: "append", reason: "approved", created_at: "2026-01-01" }], auditEvents: [{ id: "a1", user_id: "u1", namespace: "real_life", action: "persisted", table_name: "memory_items", record_id: "i1", created_at: "2026-01-01" }] }); return r; }

describe("persisted memory browser UI", () => {
  it("renders read-only shell, safety copy, disabled controls, and no edit/delete/write buttons", async () => { const vm = await loadPersistedMemoryBrowserView({ context: ctx, repository: repo(), filters: { namespace: "real_life", keyword: "coffee" } }); const html = renderToStaticMarkup(<MemoryBrowserShell viewModel={vm} />); expect(html).toContain("Read-only memory browser"); expect(html).toContain("Authenticated and namespace-scoped"); expect(html).toContain("No memory writes are available here"); expect(html).toContain("Semantic retrieval is not enabled"); expect(html).toContain("Model calls are not enabled"); expect(html).toContain("AU/story memory is not real-life evidence"); expect(html).toContain("Keyword filter only"); expect(html).toContain("disabled"); expect(html).not.toMatch(/>\s*(Edit|Delete|Write|Persist|Execute)\s*</i); });
  it("loader rejects missing auth and namespace with safe blockers", async () => { await expect(loadPersistedMemoryBrowserView({ context: { namespace: "real_life" }, repository: repo() })).resolves.toMatchObject({ blockers: [{ code: "auth_required" }], readOnly: true, wouldWrite: false }); await expect(loadPersistedMemoryBrowserView({ context: { userId: "u1" }, repository: repo() })).resolves.toMatchObject({ blockers: [{ code: "namespace_required" }], publicMemoryRead: false }); });
  it("loader uses read repository only and does not call persistence executor or Supabase directly", async () => { const r = repo(); const spy = vi.spyOn(r, "listMemoryItems"); const vm = await loadPersistedMemoryBrowserView({ context: ctx, repository: r, filters: { namespace: "real_life", keyword: "coffee" } }); expect(spy).toHaveBeenCalled(); expect(vm.items[0].patchCount).toBe(1); const source = readFileSync(join(root, "lib/services/persisted-memory-browser-loader.ts"), "utf8"); expect(source).not.toMatch(/supabase|approved-review-memory-persistence|persistence-executor|executeApproved|createClient/i); });
  it("DTO redacts long text and sensitive evidence", () => { const item = toBrowserItemView({ ...browserSafety, id: "i", namespace: "real_life", textPreview: "a".repeat(500), sensitiveEvidenceRedacted: true, auStoryMemoryIsNotRealLifeEvidence: true }); expect(item.textPreview.length).toBeLessThan(500); const src = toBrowserSourceView({ ...browserSafety, id: "s", namespace: "real_life", excerptPreview: "secret".repeat(100), sensitiveEvidenceRedacted: true }); expect(src.excerptPreview.length).toBeLessThan(600); });
  it("browser files have no embeddings, pgvector, model, retrieval, MCP, GPT Actions, service-role, or write imports", () => { const files = ["app/memory/browser/page.tsx", "lib/api/persisted-memory-browser-dto.ts", "lib/services/persisted-memory-browser-loader.ts", "components/memory-browser/MemoryBrowserShell.tsx", "components/memory-browser/MemoryItemList.tsx", "components/memory-browser/MemoryItemDetail.tsx", "components/memory-browser/MemorySourcePanel.tsx", "components/memory-browser/MemoryPatchTimeline.tsx", "components/memory-browser/MemoryAuditTrail.tsx", "components/memory-browser/MemorySafetyBanner.tsx"]; const text = files.map((f) => readFileSync(join(root, f), "utf8")).join("\n"); expect(text).not.toMatch(/openai|anthropic|model provider|retrieval-service|pgvector|embedding|service-role|serviceRole|SUPABASE_SERVICE_ROLE|GPT Actions|MCP|deleteMemory|writeMemory|persistApproved/i); });

  it("public browser route redirects to the authenticated admin route and keeps public read disabled", () => { const publicPage = readFileSync(join(root, "app/memory/browser/page.tsx"), "utf8"); const runtimeConfig = readFileSync(join(root, "lib/config/pandora-runtime-safety-config.ts"), "utf8"); expect(publicPage).toContain('redirect("/admin/memory/browser?namespace=real_life")'); expect(runtimeConfig).toContain('publicMemoryReadEnabled: "PANDORA_ENABLE_PUBLIC_MEMORY_READ"'); expect(runtimeConfig).toContain('env[v] === "true"'); });
  it("critical disabled and gated routes remain protected", () => { expect(readFileSync(join(root, "lib/api/memory-ingest-route-handler.ts"), "utf8")).toMatch(/disabled|not implemented|production/i); expect(readFileSync(join(root, "app/api/memory/review/[id]/persist/route.ts"), "utf8")).toMatch(/disabled|internal|admin/i); expect(readFileSync(join(root, "app/api/admin/memory/persistence/review/[id]/execute/route.ts"), "utf8")).toMatch(/admin|internal/i); });
});

describe("Phase 3C browser hardening", () => {
  it("renders explicit provenance, URL-backed filters, and skills proof panel", async () => {
    const vm = await loadPersistedMemoryBrowserView({ context: ctx, repository: repo(), filters: { namespace: "real_life", createdFrom: "2026-01-01", createdTo: "2026-01-31" } });
    const html = renderToStaticMarkup(<MemoryBrowserShell viewModel={vm} />);
    expect(html).toContain("Source type");
    expect(html).toContain("Audit reference");
    expect(html).toContain("Patch/proof status");
    expect(html).toContain("Skills commit proof");
    expect(html).toContain("not configured");
    expect(html).toContain("name=\"namespace\"");
    expect(html).toContain("name=\"sourceType\"");
    expect(html).toContain("name=\"proofStatus\"");
  });

  it("adds read-only audit route and keeps unsafe actions absent", () => {
    const auditPage = readFileSync(join(root, "app/admin/memory/audit/page.tsx"), "utf8");
    expect(auditPage).toContain("Read-only memory audit viewer");
    expect(auditPage).toContain("resolvePandoraServerSession");
    expect(auditPage).not.toMatch(/\.insert\(|\.update\(|\.delete\(|executeApproved|persistApproved/i);
  });
});
