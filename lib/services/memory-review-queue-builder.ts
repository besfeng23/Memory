import type { RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryIngestExtractionPipelineResult } from "@/lib/services/memory-ingest-extraction-pipeline";
import type { ExtractedMemoryCandidate } from "@/lib/services/memory-extraction-contract";
import type { MemoryReviewBlocker, MemoryReviewQueueItem, MemoryReviewWarning } from "@/lib/services/memory-review-queue-contract";

export type BuildMemoryReviewQueueItemsInput = { context: RepositoryContext; extractionResult: MemoryIngestExtractionPipelineResult; sourceRef?: string | null; requestHash?: string | null; fingerprint?: string | null; now?: string };
export type BuildMemoryReviewQueueItemsResult = { items: MemoryReviewQueueItem[]; wouldPersist: false; wouldCallModel: false; blockers: string[]; warnings: string[] };

function itemNeedsReview(input: BuildMemoryReviewQueueItemsInput, candidate: ExtractedMemoryCandidate): boolean {
  return candidate.requiresReview || input.extractionResult.status === "requires_review" || input.extractionResult.namespaceClassification === "mixed_requires_review" || candidate.sensitivity === "high" || candidate.sensitivity === "restricted";
}

export function buildMemoryReviewQueueItems(input: BuildMemoryReviewQueueItemsInput): BuildMemoryReviewQueueItemsResult {
  const now = input.now ?? new Date().toISOString();
  const items = input.extractionResult.extractedCandidates.filter((candidate) => itemNeedsReview(input, candidate)).map((candidate) => {
    const mixedContent = input.extractionResult.namespaceClassification === "mixed_requires_review";
    const blockers: MemoryReviewBlocker[] = [];
    const warnings: MemoryReviewWarning[] = [candidate.namespace === "au" ? "au_story_scope_only" : "real_life_scope_only", "no_persistence"];
    if (candidate.namespace !== input.context.namespace) blockers.push("namespace_mismatch");
    if (!candidate.evidence.length) blockers.push("missing_evidence");
    if (!candidate.appendOnly || candidate.proposedOperation !== "append") blockers.push("non_append_only_operation");
    if (mixedContent) { blockers.push("mixed_content_unresolved"); warnings.push("mixed_content_requires_review"); }
    if (candidate.sensitivity === "high" || candidate.sensitivity === "restricted") { blockers.push("sensitive_unresolved"); warnings.push("sensitive_content_flagged"); }
    const status = blockers.includes("namespace_mismatch") ? "blocked_namespace_mismatch" : blockers.includes("sensitive_unresolved") ? "blocked_sensitive" : blockers.includes("non_append_only_operation") ? "blocked_policy" : "pending_review";
    return {
      id: `review_${candidate.id}`,
      status,
      userId: input.context.userId,
      namespace: candidate.namespace,
      extractedCandidateId: candidate.id,
      candidateType: candidate.candidateType,
      normalizedText: candidate.normalizedText,
      evidence: { spans: candidate.evidence, spanRanges: candidate.evidence.map((evidence) => evidence.span), hasEvidence: candidate.evidence.length > 0 },
      sensitivity: { level: candidate.sensitivity, requiresSensitiveReview: candidate.sensitivity === "high" || candidate.sensitivity === "restricted", resolved: false },
      requiresReview: true,
      appendOnly: candidate.appendOnly,
      proposedOperation: candidate.proposedOperation,
      sourceMetadata: candidate.sourceMetadata,
      sourceRef: input.sourceRef ?? null,
      namespaceIsolation: { namespace: candidate.namespace, classification: input.extractionResult.namespaceClassification, auOnly: candidate.namespace === "au", realLifeOnly: candidate.namespace === "real_life", explicitlyFictionalized: candidate.explicitlyFictionalized === true, mixedContent, realLifeCannotConsumeAuEvidence: true, auContentCannotBecomeRealLifeEvidence: true },
      blockers: Array.from(new Set(blockers)),
      warnings: Array.from(new Set(warnings)),
      createdAt: now,
      updatedAt: now,
      audit: { createdByUserId: input.context.userId, updatedByUserId: input.context.userId, createdFrom: "extraction_pipeline", requestHash: input.requestHash ?? null, fingerprint: input.fingerprint ?? null, decisionTrail: [{ action: "created", at: now, reviewerUserId: input.context.userId }] },
    } satisfies MemoryReviewQueueItem;
  });
  return { items, wouldPersist: false, wouldCallModel: false, blockers: input.extractionResult.blockers, warnings: input.extractionResult.warnings };
}
