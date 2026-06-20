import type { FutureMemoryIngestRequest } from "@/lib/api/route-contracts";
import type { ExtractedMemoryCandidate, MemoryNamespace } from "@/lib/services/memory-extraction-contract";

export type MemoryExtractedCandidateMapperBlocker =
  | "namespace_mismatch"
  | "missing_evidence"
  | "non_append_only_operation";

export type MappedMemoryIngestCandidate = FutureMemoryIngestRequest & {
  metadata: FutureMemoryIngestRequest["metadata"] & {
    extraction: {
      candidateId: string;
      candidateType: ExtractedMemoryCandidate["candidateType"];
      evidence: ExtractedMemoryCandidate["evidence"];
      sensitivity: ExtractedMemoryCandidate["sensitivity"];
      confidence: ExtractedMemoryCandidate["confidence"];
      appendOnly: true;
      proposedOperation: "append";
      requiresReview: boolean;
      explicitlyFictionalized?: boolean;
      sourceMetadata: ExtractedMemoryCandidate["sourceMetadata"];
    };
  };
};

export type MapExtractedMemoryCandidateInput = {
  candidate: ExtractedMemoryCandidate;
  expectedNamespace: MemoryNamespace;
  sourceRef?: string | null;
  idempotencyKey?: string | null;
  requestMetadata?: Record<string, unknown>;
};

export type MapExtractedMemoryCandidateResult =
  | { ok: true; candidate: MappedMemoryIngestCandidate }
  | { ok: false; candidateId: string; blockers: MemoryExtractedCandidateMapperBlocker[] };

export function mapExtractedMemoryCandidateToIngestCandidate(
  input: MapExtractedMemoryCandidateInput,
): MapExtractedMemoryCandidateResult {
  const blockers: MemoryExtractedCandidateMapperBlocker[] = [];
  const { candidate } = input;

  if (candidate.namespace !== input.expectedNamespace) blockers.push("namespace_mismatch");
  if (!candidate.evidence.length || candidate.evidence.some((item) => !item.text.trim() || item.span.end <= item.span.start)) blockers.push("missing_evidence");
  if (!candidate.appendOnly || candidate.proposedOperation !== "append") blockers.push("non_append_only_operation");

  if (blockers.length > 0) {
    return { ok: false, candidateId: candidate.id, blockers: Array.from(new Set(blockers)) };
  }

  return {
    ok: true,
    candidate: {
      namespace: candidate.namespace,
      input: candidate.normalizedText,
      source_ref: input.sourceRef ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      metadata: {
        ...(input.requestMetadata ?? {}),
        extraction: {
          candidateId: candidate.id,
          candidateType: candidate.candidateType,
          evidence: candidate.evidence,
          sensitivity: candidate.sensitivity,
          confidence: candidate.confidence,
          appendOnly: true,
          proposedOperation: "append",
          requiresReview: candidate.requiresReview,
          explicitlyFictionalized: candidate.explicitlyFictionalized,
          sourceMetadata: candidate.sourceMetadata,
        },
      },
    },
  };
}
