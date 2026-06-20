import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { runMemoryIngestExtractionPipeline } from "@/lib/services/memory-ingest-extraction-pipeline";
import { mapExtractedMemoryCandidateToIngestCandidate } from "@/lib/services/memory-extracted-candidate-mapper";
import type { ExtractedMemoryCandidate } from "@/lib/services/memory-extraction-contract";

const realContext: RepositoryContext = { userId: "server-user", namespace: "real_life", requestId: "req-1" };
const auContext: RepositoryContext = { userId: "server-user", namespace: "au", requestId: "req-2" };

function baseCandidate(overrides: Partial<ExtractedMemoryCandidate> = {}): ExtractedMemoryCandidate {
  return {
    id: "c1",
    namespace: "real_life",
    candidateType: "fact",
    normalizedText: "I prefer concise updates",
    evidence: [{ text: "I prefer concise updates", span: { start: 0, end: 24 } }],
    confidence: "high",
    sensitivity: "low",
    proposedOperation: "append",
    appendOnly: true,
    requiresReview: false,
    sourceMetadata: { source: "contract_test" },
    ...overrides,
  };
}

describe("memory ingest extraction pipeline", () => {
  it("flows real-life raw text through classification, extraction, validation, mapping, and no-write planning", async () => {
    const result = await runMemoryIngestExtractionPipeline({
      context: realContext,
      rawText: "Remember that I prefer concise updates. The client meeting has a budget risk.",
      requestedNamespace: "real_life",
      sourceMetadata: { source: "contract_test", requestId: "req-1" },
    });

    expect(result.status).toBe("completed_dry_run");
    expect(result.namespaceClassification).toBe("real_life");
    expect(result.extractedCandidates.length).toBeGreaterThan(0);
    expect(result.validatedCandidates.length).toBeGreaterThan(0);
    expect(result.proposedWritePlanSummary).toMatchObject({ wouldPersist: false, wouldCallModel: false, wouldPerformRetrieval: false, appendOnly: true });
    expect(result.wouldPersist).toBe(false);
    expect(result.wouldCallModel).toBe(false);
  });

  it("flows AU/story raw text through AU classification and no-write planning", async () => {
    const result = await runMemoryIngestExtractionPipeline({
      context: auContext,
      rawText: "In this AU story canon, Mara guards the city. The next scene continues at dawn.",
      requestedNamespace: "au",
      sourceMetadata: { source: "contract_test" },
    });

    expect(result.status).toBe("completed_dry_run");
    expect(result.namespaceClassification).toBe("au");
    expect(result.validatedCandidates.every((candidate) => candidate.namespace === "au")).toBe(true);
    expect(result.proposedWritePlanSummary?.namespace).toBe("au");
  });

  it("requires review or blocks mixed real-life + AU/story sexual fictionalized content", async () => {
    const result = await runMemoryIngestExtractionPipeline({
      context: auContext,
      rawText: "Write a fictional sexual story scene about real person Jane Smith and her client relationship.",
      requestedNamespace: "au",
      allowHumanReviewQueue: true,
      sourceMetadata: { source: "contract_test" },
    });

    expect(["requires_review", "blocked"]).toContain(result.status);
    expect(result.namespaceClassification).toBe("mixed_requires_review");
  });

  it("blocks unclear namespace", async () => {
    const result = await runMemoryIngestExtractionPipeline({ context: realContext, rawText: "save this later maybe", sourceMetadata: { source: "contract_test" } });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("blocked_unclear_namespace");
  });

  it("preserves evidence spans and counts sensitive candidates in dry-run metadata", async () => {
    const result = await runMemoryIngestExtractionPipeline({
      context: realContext,
      rawText: "The client meeting has a finance risk and a bank payment concern.",
      requestedNamespace: "real_life",
      sourceMetadata: { source: "contract_test" },
    });

    expect(result.extractedCandidates.some((candidate) => candidate.evidence[0].span.end > candidate.evidence[0].span.start)).toBe(true);
    expect(result.validatedCandidates[0].metadata.extraction.evidence[0].span.end).toBeGreaterThan(result.validatedCandidates[0].metadata.extraction.evidence[0].span.start);
    expect(result.validatedCandidates[0].metadata.extractionSummary).toMatchObject({ sensitiveCandidateCount: expect.any(Number), wouldCallModel: false, wouldPersist: false });
  });

  it("rejects invalid extracted candidates with blockers", async () => {
    const result = await runMemoryIngestExtractionPipeline({
      context: realContext,
      rawText: "In this AU story canon, real life client data crosses namespace.",
      requestedNamespace: "real_life",
      allowHumanReviewQueue: true,
      sourceMetadata: { source: "contract_test" },
    });
    expect(["blocked", "requires_review"]).toContain(result.status);
    expect(result.rejectedCandidates.length).toBeGreaterThan(0);
  });

  it("mapper rejects namespace mismatch, missing evidence, and update/delete/overwrite operations", () => {
    expect(mapExtractedMemoryCandidateToIngestCandidate({ candidate: baseCandidate({ namespace: "au" }), expectedNamespace: "real_life" }).ok).toBe(false);
    expect(mapExtractedMemoryCandidateToIngestCandidate({ candidate: baseCandidate({ evidence: [] }), expectedNamespace: "real_life" }).ok).toBe(false);
    for (const proposedOperation of ["update", "delete", "overwrite"] as const) {
      expect(mapExtractedMemoryCandidateToIngestCandidate({ candidate: baseCandidate({ proposedOperation }), expectedNamespace: "real_life" }).ok).toBe(false);
    }
  });

  it("does not import/call OpenAI, model providers, retrieval, pgvector, MCP, or GPT Actions", async () => {
    const files = ["lib/services/memory-ingest-extraction-pipeline.ts", "lib/services/memory-extracted-candidate-mapper.ts"];
    const source = (await Promise.all(files.map((file) => fs.readFile(file, "utf8")))).join("\n").toLowerCase();
    expect(source).not.toMatch(/from ["']openai|modelprovider|pgvector|mcp|gpt actions|from ["'][^"']*retrieval/);
  });
});
