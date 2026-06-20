import { classifyMemoryNamespace } from "@/lib/services/memory-namespace-classifier";
import type {
  CandidateConfidence,
  ExtractedMemoryCandidate,
  MemoryCandidateType,
  MemoryExtractionRequest,
  MemoryExtractionResult,
  MemoryExtractionWarning,
  MemoryNamespace,
  MemorySensitivityLevel,
  SourceQuote,
} from "@/lib/services/memory-extraction-contract";

const rules: Array<{ type: MemoryCandidateType; pattern: RegExp; confidence: CandidateConfidence }> = [
  { type: "preference", pattern: /\b(?:remember that )?i (?:prefer|like|love|hate|dislike)\b[^.!?]*/gi, confidence: "high" },
  { type: "promise", pattern: /\bi promised\b[^.!?]*/gi, confidence: "high" },
  { type: "decision", pattern: /\bwe decided\b[^.!?]*/gi, confidence: "high" },
  { type: "risk", pattern: /\b(?:risk|danger|concern)\b[^.!?]*/gi, confidence: "medium" },
  { type: "story_canon", pattern: /\b(?:in this au|in this story|canon)\b[^.!?]*/gi, confidence: "high" },
  { type: "au_continuity", pattern: /\b(?:continuation|next scene|previous scene|chapter)\b[^.!?]*/gi, confidence: "medium" },
  { type: "business_context", pattern: /\b(?:business|company|client|deal|contract|email|meeting)\b[^.!?]*/gi, confidence: "medium" },
  { type: "financial_context", pattern: /\b(?:money|invoice|budget|finance|bank|payment|revenue|\$\d+)\b[^.!?]*/gi, confidence: "medium" },
  { type: "relationship_signal", pattern: /\b(?:relationship|partner|wife|husband|dating|friend|coworker)\b[^.!?]*/gi, confidence: "medium" },
  { type: "sexual_content_boundary", pattern: /\b(?:sexual|nsfw|consent|boundary)\b[^.!?]*/gi, confidence: "high" },
  { type: "fact", pattern: /\bremember that\b[^.!?]*/gi, confidence: "medium" },
];

function quote(text: string, start: number, end: number): SourceQuote {
  return { text: text.slice(start, end).trim(), span: { start, end } };
}

function sensitivity(type: MemoryCandidateType, value: string): MemorySensitivityLevel {
  if (type === "sexual_content_boundary") return "restricted";
  if (type === "risk" || /\b(health|legal|bank|finance|money|sexual|family)\b/i.test(value)) return "high";
  if (type === "relationship_signal" || type === "financial_context" || type === "family_context") return "medium";
  return "low";
}

function namespaceFor(type: MemoryCandidateType, classified: MemoryNamespace): MemoryNamespace {
  if (type === "story_canon" || type === "au_continuity") return "au";
  return classified;
}

export function extractMemoryCandidatesDeterministically(input: MemoryExtractionRequest): MemoryExtractionResult {
  const text = input.raw.text;
  const warnings: MemoryExtractionWarning[] = ["deterministic_fallback_only"];
  const blockers: MemoryExtractionResult["blockers"] = [];
  const rejectedCandidates: MemoryExtractionResult["rejectedCandidates"] = [];

  if (!text.trim()) blockers.push("empty_input");
  if ("user_id" in input.sourceMetadata || "userId" in input.sourceMetadata) {
    warnings.push("client_user_id_rejected");
    blockers.push("client_user_id_present");
  }

  const classification = classifyMemoryNamespace({ text, requestedNamespace: input.requestedNamespace, explicitlyFictionalized: input.explicitlyFictionalized });
  if (classification === "blocked_unclear") blockers.push("blocked_unclear_namespace");
  if (classification === "mixed_requires_review") {
    warnings.push("mixed_content_requires_review");
    if (!input.allowHumanReviewQueue) blockers.push("mixed_content_without_review");
  }
  if (blockers.length > 0) {
    return { status: "blocked", namespaceClassification: classification, candidates: [], rejectedCandidates, warnings, blockers, wouldCallModel: false, wouldPersist: false, appendOnly: true };
  }

  const baseNamespace: MemoryNamespace = classification === "au" ? "au" : "real_life";
  const candidates: ExtractedMemoryCandidate[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    for (const match of text.matchAll(rule.pattern)) {
      const matched = match[0]?.trim();
      if (!matched || match.index === undefined) continue;
      const key = `${rule.type}:${matched.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const candidateSensitivity = sensitivity(rule.type, matched);
      if (candidateSensitivity === "high" || candidateSensitivity === "restricted") warnings.push("sensitive_content_flagged");
      const evidence = [quote(text, match.index, match.index + match[0].length)];
      candidates.push({
        id: `det-${candidates.length + 1}`,
        namespace: namespaceFor(rule.type, baseNamespace),
        candidateType: rule.type,
        normalizedText: matched.replace(/^remember that\s+/i, "").trim(),
        evidence,
        confidence: rule.confidence,
        sensitivity: candidateSensitivity,
        proposedOperation: "append",
        appendOnly: true,
        requiresReview: classification === "mixed_requires_review",
        explicitlyFictionalized: input.explicitlyFictionalized,
        sourceMetadata: input.sourceMetadata,
      });
    }
  }

  return { status: "completed", namespaceClassification: classification, candidates, rejectedCandidates, warnings: [...new Set(warnings)], blockers, wouldCallModel: false, wouldPersist: false, appendOnly: true };
}
