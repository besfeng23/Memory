import { describe, expect, it } from "vitest";
import {
  validateMemoryCandidate,
  validateMemoryPatchCandidate,
  type MemoryValidationContext,
} from "@/lib/memory/validation";

const realLifeContext: MemoryValidationContext = {
  userId: "user_id",
  namespace: "real_life",
};

const auContext: MemoryValidationContext = {
  userId: "user_id",
  namespace: "au",
};

describe("memory candidate validation", () => {
  it("accepts sourced high-confidence real-life memory", () => {
    const result = validateMemoryCandidate(realLifeContext, {
      namespace: "real_life",
      memory_type: "business_fact",
      title: "Contract stage",
      body: "A business contract has reached a review stage.",
      strength: "high",
      confidence: 0.9,
      canon_status: "draft",
      metadata: {},
      sources: [
        {
          source_type: "document",
          source_ref: "doc-1",
          excerpt: "Contract review note",
          confidence: 0.9,
          metadata: {},
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.namespace).toBe("real_life");
      expect(result.data.memory_type).toBe("business_fact");
      expect(result.warnings).toEqual([]);
    }
  });

  it("warns but allows lower-confidence real-life memory without a source", () => {
    const result = validateMemoryCandidate(realLifeContext, {
      namespace: "real_life",
      memory_type: "observation",
      title: "Preference note",
      body: "The user prefers direct implementation updates.",
      strength: "medium",
      confidence: 0.5,
      canon_status: "draft",
      metadata: {},
      sources: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings.map((warning) => warning.code)).toContain("missing_required_source");
    }
  });

  it("rejects high-confidence real-life memory without a source", () => {
    const result = validateMemoryCandidate(realLifeContext, {
      namespace: "real_life",
      memory_type: "real_life_fact",
      title: "Deal fact",
      body: "A deal fact is being claimed with high confidence.",
      strength: "high",
      confidence: 0.9,
      canon_status: "draft",
      metadata: {},
      sources: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain("missing_required_source");
    }
  });

  it("rejects namespace mismatch", () => {
    const result = validateMemoryCandidate(realLifeContext, {
      namespace: "au",
      memory_type: "soft_canon",
      title: "Scene canon",
      body: "A fictional scene rule exists.",
      strength: "medium",
      confidence: 0.5,
      canon_status: "soft_canon",
      metadata: {},
      sources: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain("namespace_mismatch");
    }
  });

  it("rejects real-life-only type inside AU namespace", () => {
    const result = validateMemoryCandidate(auContext, {
      namespace: "au",
      memory_type: "business_fact",
      title: "Wrong type",
      body: "A business fact should not be stored as AU canon.",
      strength: "medium",
      confidence: 0.5,
      canon_status: "draft",
      metadata: {},
      sources: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain("unsupported_memory_type");
    }
  });

  it("requires a source for AU hard canon", () => {
    const result = validateMemoryCandidate(auContext, {
      namespace: "au",
      memory_type: "hard_canon",
      title: "Hard canon",
      body: "A fictional hard-canon rule is being proposed.",
      strength: "locked",
      confidence: 0.8,
      canon_status: "hard_canon",
      metadata: {},
      sources: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain("missing_required_source");
    }
  });
});

describe("memory patch candidate validation", () => {
  it("accepts initial create patch candidates without a before snapshot", () => {
    const result = validateMemoryPatchCandidate(realLifeContext, {
      namespace: "real_life",
      memory_item_id: "memory_item_id",
      patch_type: "initial_create",
      reason: null,
      after_snapshot: { title: "Initial memory" },
      metadata: {},
    });

    expect(result.ok).toBe(true);
  });

  it("requires reason and before snapshot for existing memory changes", () => {
    const result = validateMemoryPatchCandidate(realLifeContext, {
      namespace: "real_life",
      memory_item_id: "memory_item_id",
      patch_type: "confidence_change",
      after_snapshot: { confidence: 0.75 },
      metadata: {},
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toEqual(
        expect.arrayContaining(["missing_patch_reason", "unsafe_patch_shape"]),
      );
    }
  });

  it("rejects patch namespace mismatch", () => {
    const result = validateMemoryPatchCandidate(realLifeContext, {
      namespace: "au",
      memory_item_id: "memory_item_id",
      patch_type: "initial_create",
      after_snapshot: { title: "Initial memory" },
      metadata: {},
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain("namespace_mismatch");
    }
  });
});
