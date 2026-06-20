export type MemoryNamespace = "real_life" | "au";
export type MemoryNamespaceClassification = MemoryNamespace | "mixed_requires_review" | "blocked_unclear";

export type MemoryCandidateType =
  | "fact"
  | "preference"
  | "relationship_signal"
  | "promise"
  | "risk"
  | "decision"
  | "task"
  | "business_context"
  | "family_context"
  | "financial_context"
  | "story_canon"
  | "au_continuity"
  | "sexual_content_boundary"
  | "unknown";

export type CandidateConfidence = "low" | "medium" | "high";
export type MemorySensitivityLevel = "low" | "medium" | "high" | "restricted";
export type ProposedMemoryOperation = "append" | "update" | "delete" | "overwrite";

export type RawMemoryIngestText = {
  text: string;
  locale?: string;
};

export type SourceMetadata = {
  source: "deterministic_fallback" | "contract_test" | "future_model";
  sourceRef?: string | null;
  requestId?: string;
  userId?: never;
  user_id?: never;
  [key: string]: unknown;
};

export type MemoryExtractionRequest = {
  raw: RawMemoryIngestText;
  requestedNamespace?: MemoryNamespace;
  explicitlyFictionalized?: boolean;
  allowHumanReviewQueue?: boolean;
  sourceMetadata: SourceMetadata;
};

export type EvidenceSpan = {
  start: number;
  end: number;
};

export type SourceQuote = {
  text: string;
  span: EvidenceSpan;
};

export type ExtractedMemoryCandidate = {
  id: string;
  namespace: MemoryNamespace;
  candidateType: MemoryCandidateType;
  normalizedText: string;
  evidence: SourceQuote[];
  confidence: CandidateConfidence;
  sensitivity: MemorySensitivityLevel;
  proposedOperation: ProposedMemoryOperation;
  appendOnly: boolean;
  requiresReview: boolean;
  explicitlyFictionalized?: boolean;
  sourceMetadata: SourceMetadata;
};

export type RejectedMemoryCandidate = {
  reason: string;
  evidence?: SourceQuote;
  blocker?: MemoryExtractionBlocker;
};

export type MemoryExtractionWarning =
  | "deterministic_fallback_only"
  | "ambiguous_namespace"
  | "mixed_content_requires_review"
  | "sensitive_content_flagged"
  | "client_user_id_rejected";

export type MemoryExtractionBlocker =
  | "empty_input"
  | "blocked_unclear_namespace"
  | "mixed_content_without_review"
  | "invalid_evidence"
  | "client_user_id_present"
  | "non_append_only_operation";

export type MemoryExtractionResult = {
  status: "completed" | "blocked";
  namespaceClassification: MemoryNamespaceClassification;
  candidates: ExtractedMemoryCandidate[];
  rejectedCandidates: RejectedMemoryCandidate[];
  warnings: MemoryExtractionWarning[];
  blockers: MemoryExtractionBlocker[];
  wouldCallModel: false;
  wouldPersist: false;
  appendOnly: true;
};
