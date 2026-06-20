import { describe, expect, it } from "vitest";
import { plannedRouteContracts } from "@/lib/api/route-contracts";
import type { RepositoryContext } from "@/lib/db/repository-context";
import type { ExtractedMemoryCandidate } from "@/lib/services/memory-extraction-contract";
import type { MemoryIngestExtractionPipelineResult } from "@/lib/services/memory-ingest-extraction-pipeline";
import { validateMemoryReviewDecision } from "@/lib/services/memory-review-decision-validator";
import { buildMemoryReviewQueueItems } from "@/lib/services/memory-review-queue-builder";
import type { MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";
import { previewApprovedReviewItemsAsWritePlan } from "@/lib/services/memory-review-to-write-plan-preview";

const context: RepositoryContext = { userId: "server-user", namespace: "real_life", requestId: "req" };
const candidate = (overrides: Partial<ExtractedMemoryCandidate> = {}): ExtractedMemoryCandidate => ({
  id: "cand-1",
  namespace: "real_life",
  candidateType: "preference",
  normalizedText: "Remember I prefer tea.",
  evidence: [{ text: "I prefer tea", span: { start: 9, end: 21 } }],
  confidence: "medium",
  sensitivity: "low",
  proposedOperation: "append",
  appendOnly: true,
  requiresReview: true,
  sourceMetadata: { source: "contract_test" },
  ...overrides,
});
const pipeline = (candidates: ExtractedMemoryCandidate[], classification: MemoryIngestExtractionPipelineResult["namespaceClassification"] = "real_life"): MemoryIngestExtractionPipelineResult => ({
  status: classification === "mixed_requires_review" ? "requires_review" : "completed_dry_run",
  namespaceClassification: classification,
  extractedCandidates: candidates,
  validatedCandidates: [],
  rejectedCandidates: [],
  warnings: [],
  blockers: [],
  wouldPersist: false,
  wouldCallModel: false,
});
const reviewer = { userId: "reviewer", namespace: "real_life" as const };
const approve = (item: MemoryReviewQueueItem, extra = {}) => validateMemoryReviewDecision({ item, reviewer, decision: { action: "approve_append", ...extra } });

describe("memory review queue boundary", () => {
  it("creates no-write pending review items for mixed content and preserves evidence", () => {
    const result = buildMemoryReviewQueueItems({ context, extractionResult: pipeline([candidate()], "mixed_requires_review"), requestHash: "h", fingerprint: "f" });
    expect(result.wouldPersist).toBe(false);
    expect(result.items[0]).toMatchObject({ status: "pending_review", userId: "server-user", appendOnly: true, namespace: "real_life" });
    expect(result.items[0].blockers).toContain("mixed_content_unresolved");
    expect(result.items[0].evidence.spans[0].span).toEqual({ start: 9, end: 21 });
  });

  it("blocks or queues sensitive content for review", () => {
    const item = buildMemoryReviewQueueItems({ context, extractionResult: pipeline([candidate({ sensitivity: "restricted" })]) }).items[0];
    expect(item.status).toBe("blocked_sensitive");
    expect(item.blockers).toContain("sensitive_unresolved");
  });

  it("keeps AU/story and real_life candidates namespace scoped", () => {
    const au = buildMemoryReviewQueueItems({ context: { ...context, namespace: "au" }, extractionResult: pipeline([candidate({ namespace: "au", candidateType: "story_canon" })], "au") }).items[0];
    const real = buildMemoryReviewQueueItems({ context, extractionResult: pipeline([candidate()], "real_life") }).items[0];
    expect(au.namespaceIsolation).toMatchObject({ auOnly: true, realLifeOnly: false, auContentCannotBecomeRealLifeEvidence: true });
    expect(real.namespaceIsolation).toMatchObject({ realLifeOnly: true, auOnly: false, realLifeCannotConsumeAuEvidence: true });
  });

  it("validates approve_append only for pending append-only items and blocks unsafe approvals", () => {
    const item = buildMemoryReviewQueueItems({ context, extractionResult: pipeline([candidate()]) }).items[0];
    expect(approve(item).ok).toBe(true);
    expect(approve({ ...item, appendOnly: false }).blockers).toContain("non_append_only_operation");
    expect(approve({ ...item, namespace: "au" }).blockers).toContain("namespace_mismatch");
    expect(approve({ ...item, evidence: { ...item.evidence, hasEvidence: false, spans: [] } }).blockers).toContain("missing_evidence");
    expect(approve({ ...item, namespaceIsolation: { ...item.namespaceIsolation, mixedContent: true } }).blockers).toContain("mixed_content_unresolved");
    expect(approve(item, { client_user_id: "attacker" }).userId).toBe("reviewer");
    expect(approve(item, { client_user_id: "attacker" }).blockers).toContain("client_user_id_override_attempt");
  });

  it("reject/archive decisions never create persistence operations", () => {
    const item = buildMemoryReviewQueueItems({ context, extractionResult: pipeline([candidate()]) }).items[0];
    for (const action of ["reject", "archive"] as const) {
      const result = validateMemoryReviewDecision({ item, reviewer, decision: { action } });
      expect(result.wouldPersist).toBe(false);
      expect(result.wouldCreatePersistenceOperation).toBe(false);
    }
  });

  it("previews approved reviews as no-write append plans and blocks unsafe items", () => {
    const item = buildMemoryReviewQueueItems({ context, extractionResult: pipeline([candidate()]) }).items[0];
    const approved: MemoryReviewQueueItem = { ...item, status: "approved_for_append", sensitivity: { ...item.sensitivity, resolved: true } };
    const preview = previewApprovedReviewItemsAsWritePlan({ context, items: [approved] });
    expect(preview).toMatchObject({ status: "planned", wouldPersist: false, wouldCallModel: false, wouldPerformRetrieval: false, appendOnly: true });
    expect(preview.candidates[0].metadata.review.extractedCandidateId).toBe("cand-1");
    expect(previewApprovedReviewItemsAsWritePlan({ context, items: [item] }).status).toBe("blocked");
    expect(previewApprovedReviewItemsAsWritePlan({ context, items: [{ ...approved, proposedOperation: "overwrite" }] }).blockers).toContain("non_append_only_operation");
  });

  it("does not activate production ingest or introduce provider/retrieval contracts", async () => {
    expect(plannedRouteContracts.find((route) => route.path === "/api/memory/ingest")).toMatchObject({ status: "disabled_stub", mutatesMemory: false });
    const modules = await Promise.all([import("@/lib/services/memory-review-queue-builder"), import("@/lib/services/memory-review-decision-validator"), import("@/lib/services/memory-review-to-write-plan-preview")]);
    expect(modules.every(Boolean)).toBe(true);
  });
});
