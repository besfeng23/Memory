import { describe, expect, it } from "vitest";
import { extractMemoryCandidatesDeterministically } from "@/lib/services/deterministic-memory-extractor";
import type { ExtractedMemoryCandidate, MemoryExtractionRequest } from "@/lib/services/memory-extraction-contract";
import { classifyMemoryNamespace } from "@/lib/services/memory-namespace-classifier";
import { validateExtractedMemoryCandidates } from "@/lib/services/memory-extraction-validator";
import fs from "node:fs/promises";

function req(text: string, extra: Partial<MemoryExtractionRequest> = {}): MemoryExtractionRequest {
  return { raw: { text }, sourceMetadata: { source: "contract_test" }, ...extra };
}

function candidate(overrides: Partial<ExtractedMemoryCandidate> = {}): ExtractedMemoryCandidate {
  return {
    id: "c1",
    namespace: "real_life",
    candidateType: "fact",
    normalizedText: "remember this",
    evidence: [{ text: "remember this", span: { start: 0, end: 13 } }],
    confidence: "medium",
    sensitivity: "low",
    proposedOperation: "append",
    appendOnly: true,
    requiresReview: false,
    sourceMetadata: { source: "contract_test" },
    ...overrides,
  };
}

describe("memory namespace classifier", () => {
  it("classifies real-life business text as real_life", () => {
    expect(classifyMemoryNamespace({ text: "Remember the client deal and company contract meeting." })).toBe("real_life");
  });

  it("classifies AU/story text as au", () => {
    expect(classifyMemoryNamespace({ text: "In this AU story canon, Mara guards the city." })).toBe("au");
  });

  it("requires review for mixed real person and fictional sexual/story text", () => {
    expect(classifyMemoryNamespace({ text: "Write a fictional sexual story scene about real person Jane Smith." })).toBe("mixed_requires_review");
  });

  it("blocks unclear namespace", () => {
    expect(classifyMemoryNamespace({ text: "save this later maybe" })).toBe("blocked_unclear");
  });
});

describe("deterministic memory extractor", () => {
  it("extracts fact, preference, promise, risk, and decision candidates with evidence spans", () => {
    const result = extractMemoryCandidatesDeterministically(req("Remember that I prefer concise updates. I promised to call the client. We decided to delay launch. Risk of budget overrun."));
    expect(result.status).toBe("completed");
    expect(result.candidates.map((item) => item.candidateType)).toEqual(expect.arrayContaining(["fact", "preference", "promise", "decision", "risk"]));
    expect(result.candidates.every((item) => item.evidence[0].span.end > item.evidence[0].span.start)).toBe(true);
    expect(result.wouldCallModel).toBe(false);
    expect(result.wouldPersist).toBe(false);
  });

  it("marks business and financial context", () => {
    const result = extractMemoryCandidatesDeterministically(req("The company client deal includes a $5000 invoice and finance risk."));
    expect(result.candidates.map((item) => item.candidateType)).toEqual(expect.arrayContaining(["business_context", "financial_context"]));
    expect(result.candidates.some((item) => item.sensitivity === "high")).toBe(true);
  });

  it("marks story canon and AU continuity", () => {
    const result = extractMemoryCandidatesDeterministically(req("In this AU story canon, Lio remembers the moon gate. Continue the next scene tomorrow."));
    expect(result.namespaceClassification).toBe("au");
    expect(result.candidates.map((item) => item.candidateType)).toEqual(expect.arrayContaining(["story_canon", "au_continuity"]));
    expect(result.candidates.every((item) => item.namespace === "au")).toBe(true);
  });

  it("refuses ambiguous mixed AU/real-life content unless review is enabled", () => {
    const result = extractMemoryCandidatesDeterministically(req("In this AU story about my client relationship, add a sexual boundary."));
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("mixed_content_without_review");
  });
});

describe("memory extraction validator", () => {
  it("blocks AU-as-real-life and real-life-as-AU unless fictionalized", () => {
    expect(validateExtractedMemoryCandidates({ namespaceClassification: "au", candidates: [candidate({ namespace: "real_life" })] }).ok).toBe(false);
    expect(validateExtractedMemoryCandidates({ namespaceClassification: "real_life", candidates: [candidate({ namespace: "au", candidateType: "story_canon" })] }).ok).toBe(false);
    expect(validateExtractedMemoryCandidates({ namespaceClassification: "au", candidates: [candidate({ namespace: "au", candidateType: "story_canon", explicitlyFictionalized: true })] }).ok).toBe(true);
  });

  it("blocks missing evidence, update/delete/overwrite operations, and appendOnly false", () => {
    expect(validateExtractedMemoryCandidates({ candidates: [candidate({ evidence: [] })] }).ok).toBe(false);
    expect(validateExtractedMemoryCandidates({ candidates: [candidate({ proposedOperation: "update" })] }).ok).toBe(false);
    expect(validateExtractedMemoryCandidates({ candidates: [candidate({ proposedOperation: "delete" })] }).ok).toBe(false);
    expect(validateExtractedMemoryCandidates({ candidates: [candidate({ proposedOperation: "overwrite" })] }).ok).toBe(false);
    expect(validateExtractedMemoryCandidates({ candidates: [candidate({ appendOnly: false })] }).ok).toBe(false);
  });

  it("flags sensitive content and rejects client user_id", () => {
    expect(validateExtractedMemoryCandidates({ candidates: [candidate({ candidateType: "sexual_content_boundary", sensitivity: "low" })] }).ok).toBe(false);
    expect(validateExtractedMemoryCandidates({ candidates: [candidate()], clientUserId: "client" }).ok).toBe(false);
  });

  it("does not import or call model, OpenAI, retrieval, pgvector, MCP, or GPT Actions in the contract files", async () => {
    const files = ["lib/services/memory-extraction-contract.ts", "lib/services/memory-namespace-classifier.ts", "lib/services/deterministic-memory-extractor.ts", "lib/services/memory-extraction-validator.ts"];
    const source = (await Promise.all(files.map((file) => fs.readFile(file, "utf8")))).join("\n").toLowerCase();
    expect(source).not.toMatch(/from ["']openai|modelprovider|pgvector|mcp|gpt actions|retrieval/);
  });
});
