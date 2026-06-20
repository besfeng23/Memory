import type { RepositoryContext } from "@/lib/db/repository-context";
import { createRequestFingerprint, createRequestHash } from "@/lib/api/request-fingerprint";
import type { Json } from "@/lib/supabase/database.types";
import type { MemoryIngestWritePlan } from "@/lib/services/memory-ingest-write-plan-builder";
import { buildMemoryIngestWritePlan } from "@/lib/services/memory-ingest-write-plan-builder";
import { extractMemoryCandidatesDeterministically } from "@/lib/services/deterministic-memory-extractor";
import type { ExtractedMemoryCandidate, MemoryExtractionBlocker, MemoryExtractionWarning, MemoryNamespace, MemoryNamespaceClassification, SourceMetadata } from "@/lib/services/memory-extraction-contract";
import { validateExtractedMemoryCandidates, type MemoryExtractionValidationIssue } from "@/lib/services/memory-extraction-validator";
import { mapExtractedMemoryCandidateToIngestCandidate, type MappedMemoryIngestCandidate, type MemoryExtractedCandidateMapperBlocker } from "@/lib/services/memory-extracted-candidate-mapper";
import { runMemoryIngestPersistencePreflight } from "@/lib/services/memory-ingest-persistence-preflight";

export type MemoryIngestExtractionPipelineInput = {
  context: RepositoryContext;
  rawText: string;
  requestedNamespace?: MemoryNamespace;
  explicitlyFictionalized?: boolean;
  allowHumanReviewQueue?: boolean;
  requestMetadata?: Record<string, unknown>;
  sourceMetadata: SourceMetadata;
  sourceRef?: string | null;
  idempotencyKey?: string | null;
  dryRun?: boolean;
  testMode?: boolean;
};

export type RejectedMappedMemoryCandidate = {
  candidateId?: string;
  reason: string;
  blockers: Array<MemoryExtractionBlocker | MemoryExtractedCandidateMapperBlocker | MemoryExtractionValidationIssue["code"]>;
};

export type MemoryIngestExtractionPipelineResult = {
  status: "completed_dry_run" | "blocked" | "requires_review";
  namespaceClassification: MemoryNamespaceClassification;
  extractedCandidates: ExtractedMemoryCandidate[];
  validatedCandidates: MappedMemoryIngestCandidate[];
  rejectedCandidates: RejectedMappedMemoryCandidate[];
  warnings: Array<MemoryExtractionWarning | string>;
  blockers: string[];
  proposedWritePlanSummary?: Pick<MemoryIngestWritePlan, "status" | "namespace" | "wouldPersist" | "wouldCallModel" | "wouldPerformRetrieval" | "appendOnly" | "plannedOperations" | "blockers" | "warnings">;
  wouldPersist: false;
  wouldCallModel: false;
};

export async function runMemoryIngestExtractionPipeline(input: MemoryIngestExtractionPipelineInput): Promise<MemoryIngestExtractionPipelineResult> {
  const extraction = extractMemoryCandidatesDeterministically({
    raw: { text: input.rawText },
    requestedNamespace: input.requestedNamespace,
    explicitlyFictionalized: input.explicitlyFictionalized,
    allowHumanReviewQueue: input.allowHumanReviewQueue,
    sourceMetadata: input.sourceMetadata,
  });

  const warnings: Array<MemoryExtractionWarning | string> = [...extraction.warnings, "no_model_call", "no_persistence"];
  const blockers: string[] = [...extraction.blockers];
  const rejectedCandidates: RejectedMappedMemoryCandidate[] = extraction.rejectedCandidates.map((candidate) => ({
    reason: candidate.reason,
    blockers: candidate.blocker ? [candidate.blocker] : [],
  }));

  const validation = validateExtractedMemoryCandidates({ candidates: extraction.candidates, namespaceClassification: extraction.namespaceClassification });
  if (!validation.ok) {
    rejectedCandidates.push(...validation.issues.map((issue) => ({ candidateId: issue.candidateId, reason: issue.message, blockers: [issue.code] })));
    blockers.push(...validation.issues.filter((issue) => issue.code !== "mixed_requires_review").map((issue) => issue.code));
  }

  const expectedNamespace = extraction.namespaceClassification === "au" ? "au" : extraction.namespaceClassification === "real_life" ? "real_life" : input.context.namespace;
  const validatedCandidates: MappedMemoryIngestCandidate[] = [];

  for (const candidate of extraction.candidates) {
    const mapped = mapExtractedMemoryCandidateToIngestCandidate({
      candidate,
      expectedNamespace,
      sourceRef: input.sourceRef,
      idempotencyKey: input.idempotencyKey,
      requestMetadata: input.requestMetadata,
    });
    if (mapped.ok) validatedCandidates.push(mapped.candidate);
    else rejectedCandidates.push({ candidateId: mapped.candidateId, reason: "Extracted candidate could not be mapped to ingest candidate.", blockers: mapped.blockers });
  }

  const extractionSummary = {
    namespaceClassification: extraction.namespaceClassification,
    extractedCandidateCount: extraction.candidates.length,
    validatedCandidateCount: validatedCandidates.length,
    rejectedCandidateCount: rejectedCandidates.length,
    sensitiveCandidateCount: extraction.candidates.filter((item) => item.sensitivity === "high" || item.sensitivity === "restricted").length,
    requiresReview: extraction.namespaceClassification === "mixed_requires_review" || extraction.candidates.some((item) => item.requiresReview),
    wouldCallModel: false,
    wouldPersist: false,
  };
  for (const candidate of validatedCandidates) {
    candidate.metadata.extractionSummary = extractionSummary;
  }

  const firstCandidate = validatedCandidates[0];
  let proposedWritePlanSummary: MemoryIngestExtractionPipelineResult["proposedWritePlanSummary"];
  if (firstCandidate) {
    const requestBody = firstCandidate as unknown as Json;
    const requestHash = createRequestHash(requestBody);
    const fingerprint = createRequestFingerprint({ body: requestBody, idempotencyKey: firstCandidate.idempotency_key, namespace: input.context.namespace, route: "/api/memory/ingest" });
    const preflight = await runMemoryIngestPersistencePreflight({ context: input.context, request: firstCandidate, requestHash, fingerprint, dryRunMetadata: { mode: "extraction_pipeline_no_write" } });
    if (preflight.ok) {
      const plan = buildMemoryIngestWritePlan({ context: input.context, request: firstCandidate, preflight: preflight.data, requestHash, fingerprint, dryRunMetadata: { mode: "extraction_pipeline_no_write" } });
      if (plan.ok) proposedWritePlanSummary = {
        status: plan.data.status,
        namespace: plan.data.namespace,
        wouldPersist: plan.data.wouldPersist,
        wouldCallModel: plan.data.wouldCallModel,
        wouldPerformRetrieval: plan.data.wouldPerformRetrieval,
        appendOnly: plan.data.appendOnly,
        plannedOperations: plan.data.plannedOperations,
        blockers: plan.data.blockers,
        warnings: plan.data.warnings,
      };
    }
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  const requiresReview = extraction.namespaceClassification === "mixed_requires_review" || extraction.candidates.some((candidate) => candidate.requiresReview);
  return {
    status: uniqueBlockers.length > 0 ? "blocked" : requiresReview ? "requires_review" : "completed_dry_run",
    namespaceClassification: extraction.namespaceClassification,
    extractedCandidates: extraction.candidates,
    validatedCandidates,
    rejectedCandidates,
    warnings: Array.from(new Set(warnings)),
    blockers: uniqueBlockers,
    proposedWritePlanSummary,
    wouldPersist: false,
    wouldCallModel: false,
  };
}
