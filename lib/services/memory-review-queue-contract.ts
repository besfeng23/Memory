import type { RepositoryContext } from "@/lib/db/repository-context";
import type { EvidenceSpan, MemoryCandidateType, MemoryNamespace, MemoryNamespaceClassification, MemorySensitivityLevel, ProposedMemoryOperation, SourceMetadata, SourceQuote } from "@/lib/services/memory-extraction-contract";

export type MemoryReviewStatus =
  | "pending_review"
  | "approved_for_append"
  | "rejected"
  | "needs_clarification"
  | "blocked_namespace_mismatch"
  | "blocked_sensitive"
  | "blocked_policy"
  | "archived";

export type MemoryReviewAction = "approve_append" | "reject" | "request_clarification" | "mark_sensitive" | "mark_namespace_mismatch" | "archive";
export type MemoryReviewDecision = { action: MemoryReviewAction; reason?: string; resolvedMixedContent?: boolean; resolvedSensitive?: boolean; namespaceAfterReview?: MemoryNamespace; clientUserId?: string; client_user_id?: string };
export type MemoryReviewerContext = Pick<RepositoryContext, "userId" | "namespace" | "requestId"> & { reviewerRole?: "human_reviewer" | "system_contract" };

export type CandidateEvidenceSnapshot = { spans: SourceQuote[]; spanRanges: EvidenceSpan[]; hasEvidence: boolean };
export type NamespaceIsolationSnapshot = {
  namespace: MemoryNamespace;
  classification: MemoryNamespaceClassification;
  auOnly: boolean;
  realLifeOnly: boolean;
  explicitlyFictionalized: boolean;
  mixedContent: boolean;
  realLifeCannotConsumeAuEvidence: true;
  auContentCannotBecomeRealLifeEvidence: true;
};
export type SensitivitySnapshot = { level: MemorySensitivityLevel; requiresSensitiveReview: boolean; resolved: boolean };
export type MemoryReviewBlocker = "namespace_mismatch" | "sensitive_unresolved" | "policy_blocked" | "missing_evidence" | "mixed_content_unresolved" | "non_append_only_operation" | "client_user_id_override_attempt" | "not_pending";
export type MemoryReviewWarning = "mixed_content_requires_review" | "sensitive_content_flagged" | "au_story_scope_only" | "real_life_scope_only" | "no_persistence";
export type MemoryReviewAuditMetadata = { createdByUserId: string; updatedByUserId: string; createdFrom: "extraction_pipeline" | "contract_test"; requestHash?: string | null; fingerprint?: string | null; decisionTrail: Array<{ action: MemoryReviewAction | "created"; at: string; reviewerUserId: string; reason?: string }> };

export type MemoryReviewQueueItem = {
  id: string;
  status: MemoryReviewStatus;
  userId: string;
  namespace: MemoryNamespace;
  extractedCandidateId: string;
  candidateType: MemoryCandidateType;
  normalizedText: string;
  evidence: CandidateEvidenceSnapshot;
  sensitivity: SensitivitySnapshot;
  requiresReview: boolean;
  appendOnly: boolean;
  proposedOperation: ProposedMemoryOperation;
  sourceMetadata: SourceMetadata;
  sourceRef?: string | null;
  namespaceIsolation: NamespaceIsolationSnapshot;
  blockers: MemoryReviewBlocker[];
  warnings: MemoryReviewWarning[];
  createdAt: string;
  updatedAt: string;
  audit: MemoryReviewAuditMetadata;
};
