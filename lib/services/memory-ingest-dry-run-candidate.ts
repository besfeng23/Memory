import { repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";
import { runMemoryIngestPersistencePreflight, type MemoryIngestPersistencePreflightResult } from "@/lib/services/memory-ingest-persistence-preflight";
import { executeMemoryIngestWritePlanDryRun, type MemoryIngestWritePlanExecutionReport } from "@/lib/services/memory-ingest-write-plan-executor";
import { buildMemoryIngestWritePlan, type MemoryIngestWritePlan } from "@/lib/services/memory-ingest-write-plan-builder";
import type { GuardedIngestCandidateInput, GuardedIngestCandidateResult } from "@/lib/services/guarded-ingest-service";

export type MemoryIngestDryRunSummary = {
  wouldClassify: true;
  wouldExtractCandidates: true;
  wouldValidateNamespace: true;
  wouldPersist: false;
  wouldCallModel: false;
  namespacePolicy: "real_life_explicit" | "au_explicit_story_only";
  userIdSource: "server_auth_context";
  appendOnlyFutureWrites: true;
  persistencePreflight: MemoryIngestPersistencePreflightResult;
  writePlan?: Pick<MemoryIngestWritePlan, "status" | "appendOnly" | "wouldPersist" | "wouldCallModel" | "wouldPerformRetrieval" | "plannedOperations" | "blockers">;
  namespaceClassification?: unknown;
  extractedCandidateCount?: number;
  validatedCandidateCount?: number;
  rejectedCandidateCount?: number;
  sensitiveCandidateCount?: number;
  requiresReview?: boolean;
  noModelCallConfirmed?: true;
  noPersistenceConfirmed?: true;
  executionReport?: Pick<
    MemoryIngestWritePlanExecutionReport,
    | "status"
    | "executedOperations"
    | "blockedOperations"
    | "wouldPersist"
    | "writesPerformed"
    | "wouldCallModel"
    | "wouldPerformRetrieval"
    | "appendOnly"
    | "usesClientUserId"
    | "blockers"
  >;
};

export type MemoryIngestDryRunCandidateResult = GuardedIngestCandidateResult & {
  dryRun: MemoryIngestDryRunSummary;
};

function getExtractionSummary(metadata: Record<string, unknown>): {
  namespaceClassification?: unknown;
  extractedCandidateCount?: number;
  validatedCandidateCount?: number;
  rejectedCandidateCount?: number;
  sensitiveCandidateCount?: number;
  requiresReview?: boolean;
  noModelCallConfirmed?: true;
  noPersistenceConfirmed?: true;
} {
  const summary = metadata.extractionSummary;
  if (!summary || typeof summary !== "object") return {};
  const value = summary as Record<string, unknown>;
  return {
    namespaceClassification: value.namespaceClassification,
    extractedCandidateCount: typeof value.extractedCandidateCount === "number" ? value.extractedCandidateCount : undefined,
    validatedCandidateCount: typeof value.validatedCandidateCount === "number" ? value.validatedCandidateCount : undefined,
    rejectedCandidateCount: typeof value.rejectedCandidateCount === "number" ? value.rejectedCandidateCount : undefined,
    sensitiveCandidateCount: typeof value.sensitiveCandidateCount === "number" ? value.sensitiveCandidateCount : undefined,
    requiresReview: typeof value.requiresReview === "boolean" ? value.requiresReview : undefined,
    noModelCallConfirmed: value.wouldCallModel === false ? true : undefined,
    noPersistenceConfirmed: value.wouldPersist === false ? true : undefined,
  };
}

export async function runMemoryIngestDryRunCandidate(
  input: GuardedIngestCandidateInput,
): Promise<RepositoryResult<MemoryIngestDryRunCandidateResult>> {
  const namespacePolicy = input.request.namespace === "real_life" ? "real_life_explicit" : "au_explicit_story_only";
  const extractionSummary = getExtractionSummary(input.request.metadata);

  const preflight = await runMemoryIngestPersistencePreflight({
    context: input.context,
    request: input.request,
    requestHash: input.requestHash,
    fingerprint: input.fingerprint,
    dryRunMetadata: { mode: "dry_run_only" },
  });

  if (!preflight.ok) return preflight;

  const writePlan =
    preflight.data.status === "ready"
      ? buildMemoryIngestWritePlan({
          context: input.context,
          request: input.request,
          preflight: preflight.data,
          requestHash: input.requestHash,
          fingerprint: input.fingerprint,
          dryRunMetadata: { mode: "dry_run_only" },
        })
      : null;

  const executionReport =
    writePlan?.ok
      ? executeMemoryIngestWritePlanDryRun({
          context: input.context,
          request: input.request,
          writePlan: writePlan.data,
          requestHash: input.requestHash,
          fingerprint: input.fingerprint,
        })
      : null;

  return repositoryOk({
    status: "completed",
    namespace: input.request.namespace,
    sourceIds: [],
    warnings: ["dry_run_only"],
    dryRun: {
      wouldClassify: true,
      wouldExtractCandidates: true,
      wouldValidateNamespace: true,
      wouldPersist: false,
      wouldCallModel: false,
      namespacePolicy,
      userIdSource: "server_auth_context",
      appendOnlyFutureWrites: true,
      ...extractionSummary,
      persistencePreflight: preflight.data,
      ...(writePlan?.ok
        ? {
            writePlan: {
              status: writePlan.data.status,
              appendOnly: writePlan.data.appendOnly,
              wouldPersist: writePlan.data.wouldPersist,
              wouldCallModel: writePlan.data.wouldCallModel,
              wouldPerformRetrieval: writePlan.data.wouldPerformRetrieval,
              plannedOperations: writePlan.data.plannedOperations,
              blockers: writePlan.data.blockers,
            },
          }
        : {}),
      ...(executionReport?.ok
        ? {
            executionReport: {
              status: executionReport.data.status,
              executedOperations: executionReport.data.executedOperations,
              blockedOperations: executionReport.data.blockedOperations,
              wouldPersist: executionReport.data.wouldPersist,
              writesPerformed: executionReport.data.writesPerformed,
              wouldCallModel: executionReport.data.wouldCallModel,
              wouldPerformRetrieval: executionReport.data.wouldPerformRetrieval,
              appendOnly: executionReport.data.appendOnly,
              usesClientUserId: executionReport.data.usesClientUserId,
              blockers: executionReport.data.blockers,
            },
          }
        : {}),
    },
  });
}
