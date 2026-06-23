import type { ApprovedReviewPersistencePreviewInput, ApprovedReviewPersistencePreviewResult, PreviewSummaryDto } from "@/lib/services/approved-review-memory-persistence-preview-contract";
import { buildApprovedReviewMemoryAppendPlan } from "@/lib/services/approved-review-memory-append-plan-builder";

export function previewApprovedReviewMemoryPersistence(input: ApprovedReviewPersistencePreviewInput): ApprovedReviewPersistencePreviewResult {
  const { plans } = buildApprovedReviewMemoryAppendPlan(input);
  const blockers = Array.from(new Set(plans.flatMap((p) => p.blockers)));
  const warnings = Array.from(new Set(plans.flatMap((p) => p.warnings)));
  const summary: PreviewSummaryDto = { eligible: plans.filter((p) => p.eligible).length, blocked: plans.filter((p) => !p.eligible).length, plannedSources: plans.filter((p) => p.source).length, plannedItems: plans.filter((p) => p.item).length, plannedPatches: plans.filter((p) => p.patch).length, plannedAuditLogs: plans.filter((p) => p.auditLog).length, wouldPersist: false, productionWriteDisabled: true, requiresFutureInternalGate: true };
  return { ok: blockers.length === 0, previewOnly: true, approvedReviewItemIsNotMemory: true, futureGatedPersistenceRequired: true, wouldPersist: false, wouldCallModel: false, wouldEmbed: false, productionWriteDisabled: true, requiresFutureInternalGate: true, plans, blockers, warnings, summary };
}
