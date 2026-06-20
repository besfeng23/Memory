import type { ExtractedMemoryCandidate, MemoryExtractionBlocker } from "@/lib/services/memory-extraction-contract";

export type ValidateExtractedMemoryCandidatesInput = {
  candidates: ExtractedMemoryCandidate[];
  namespaceClassification?: "real_life" | "au" | "mixed_requires_review" | "blocked_unclear";
  clientUserId?: string;
};

export type MemoryExtractionValidationIssue = {
  candidateId?: string;
  code: MemoryExtractionBlocker | "namespace_mismatch" | "au_as_real_life" | "real_life_as_au" | "sensitive_content_unflagged" | "mixed_requires_review";
  message: string;
};

const confidence = new Set(["low", "medium", "high"]);
const forbiddenOperations = new Set(["update", "delete", "overwrite"]);

export function validateExtractedMemoryCandidates(input: ValidateExtractedMemoryCandidatesInput): { ok: true; warnings: string[] } | { ok: false; issues: MemoryExtractionValidationIssue[] } {
  const issues: MemoryExtractionValidationIssue[] = [];
  if (input.clientUserId) issues.push({ code: "client_user_id_present", message: "Client-supplied user_id must be ignored/rejected." });
  if (input.namespaceClassification === "mixed_requires_review") issues.push({ code: "mixed_requires_review", message: "Mixed content requires human review before persistence." });
  if (input.namespaceClassification === "blocked_unclear") issues.push({ code: "blocked_unclear_namespace", message: "Unclear namespace blocks extraction." });

  for (const candidate of input.candidates) {
    if (input.namespaceClassification === "real_life" && (candidate.candidateType === "story_canon" || candidate.candidateType === "au_continuity" || candidate.namespace === "au")) {
      issues.push({ candidateId: candidate.id, code: "real_life_as_au", message: "Real-life content cannot enter AU unless explicitly fictionalized." });
    }
    if (input.namespaceClassification === "au" && candidate.namespace === "real_life") {
      issues.push({ candidateId: candidate.id, code: "au_as_real_life", message: "AU/story content must never be marked real_life." });
    }
    if (candidate.namespace === "au" && input.namespaceClassification === "real_life" && !candidate.explicitlyFictionalized) {
      issues.push({ candidateId: candidate.id, code: "real_life_as_au", message: "Real-life candidate needs explicit fictionalization before AU classification." });
    }
    if (!candidate.evidence.length || candidate.evidence.some((item) => !item.text || item.span.start < 0 || item.span.end <= item.span.start)) {
      issues.push({ candidateId: candidate.id, code: "invalid_evidence", message: "Candidates require source evidence spans." });
    }
    if (!confidence.has(candidate.confidence)) issues.push({ candidateId: candidate.id, code: "invalid_evidence", message: "Confidence is outside the contract range." });
    if (!candidate.appendOnly) issues.push({ candidateId: candidate.id, code: "non_append_only_operation", message: "Future writes must remain append-only." });
    if (forbiddenOperations.has(candidate.proposedOperation)) issues.push({ candidateId: candidate.id, code: "non_append_only_operation", message: "Update/delete/overwrite operations are forbidden." });
    if ((candidate.candidateType === "sexual_content_boundary" || candidate.candidateType === "risk" || /financial|family/.test(candidate.candidateType)) && candidate.sensitivity === "low") {
      issues.push({ candidateId: candidate.id, code: "sensitive_content_unflagged", message: "Sensitive categories must be flagged above low sensitivity." });
    }
    if ("user_id" in candidate.sourceMetadata || "userId" in candidate.sourceMetadata) {
      issues.push({ candidateId: candidate.id, code: "client_user_id_present", message: "Candidate metadata must not carry client user_id." });
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, warnings: [] };
}
