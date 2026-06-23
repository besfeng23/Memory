import type { RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";
import type { MemoryNamespace, SourceMetadata } from "@/lib/services/memory-extraction-contract";

export type ApprovedReviewPersistenceBlocker =
  | "not_approved_for_append" | "append_only_required" | "non_append_operation" | "missing_evidence"
  | "invalid_namespace" | "sensitivity_unresolved" | "archived" | "already_persisted"
  | "namespace_mismatch" | "client_user_id_override_attempt" | "mixed_content_unresolved"
  | "blocked_sensitive" | "blocked_namespace_mismatch" | "rejected" | "needs_clarification"
  | "au_to_real_life_contamination" | "real_life_to_au_contamination";
export type ApprovedReviewPersistenceWarning = "preview_only" | "approved_item_is_not_memory" | "future_gate_required" | "no_production_write" | "namespace_preserved";
export type NamespaceSafetySnapshot = { sourceNamespace: MemoryNamespace; targetNamespace: MemoryNamespace; namespacePreserved: boolean; auCannotBecomeRealLifeEvidence: true; realLifeCannotEnterAuWithoutFictionalizedReview: true; explicitlyFictionalized: boolean; mixedContent: boolean };
export type EvidenceSafetySnapshot = { hasEvidence: boolean; spanCount: number; evidencePreserved: true; candidateContentEdited: false; auStoryDataNeverRealLifeEvidence: true; realLifeDataNeverAuWithoutReview: true };
export type ApprovedReviewPersistencePreviewInput = { context: Pick<RepositoryContext, "userId" | "namespace" | "requestId">; items: MemoryReviewQueueItem[]; clientUserId?: string; client_user_id?: string; targetNamespace?: MemoryNamespace };
export type PlannedMemorySourceAppend = { kind: "memory_source_append"; reviewItemId: string; userId: string; namespace: MemoryNamespace; sourceRef?: string | null; sourceMetadata: SourceMetadata; reviewDecisionRef: string; appendOnly: true; wouldPersist: false };
export type PlannedMemoryItemAppend = { kind: "memory_item_append"; reviewItemId: string; userId: string; namespace: MemoryNamespace; candidateType: string; content: string; evidence: EvidenceSafetySnapshot; appendOnly: true; wouldPersist: false };
export type PlannedMemoryPatchAppend = { kind: "memory_patch_append"; reviewItemId: string; operation: "append"; namespace: MemoryNamespace; preservesCandidateContent: true; appendOnly: true; wouldPersist: false };
export type PlannedAuditLogAppend = { kind: "audit_log_append"; reviewItemId: string; actorUserId: string; action: "approved_review_memory_persistence_previewed"; appendOnly: true; wouldPersist: false };
export type ApprovedReviewItemPlan = { itemId: string; eligible: boolean; blockers: ApprovedReviewPersistenceBlocker[]; warnings: ApprovedReviewPersistenceWarning[]; namespaceSafety: NamespaceSafetySnapshot; evidenceSafety: EvidenceSafetySnapshot; source?: PlannedMemorySourceAppend; item?: PlannedMemoryItemAppend; patch?: PlannedMemoryPatchAppend; auditLog?: PlannedAuditLogAppend; wouldPersist: false; wouldCallModel: false; wouldEmbed: false };
export type PreviewSummaryDto = { eligible: number; blocked: number; plannedSources: number; plannedItems: number; plannedPatches: number; plannedAuditLogs: number; wouldPersist: false; productionWriteDisabled: true; requiresFutureInternalGate: true };
export type ApprovedReviewPersistencePreviewResult = { ok: boolean; previewOnly: true; approvedReviewItemIsNotMemory: true; futureGatedPersistenceRequired: true; wouldPersist: false; wouldCallModel: false; wouldEmbed: false; productionWriteDisabled: true; requiresFutureInternalGate: true; plans: ApprovedReviewItemPlan[]; blockers: ApprovedReviewPersistenceBlocker[]; warnings: ApprovedReviewPersistenceWarning[]; summary: PreviewSummaryDto };
