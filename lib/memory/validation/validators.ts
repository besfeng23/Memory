import type { PandoraNamespace } from "@/lib/supabase/database.types";
import {
  AU_MEMORY_TYPES,
  REAL_LIFE_MEMORY_TYPES,
  memoryCandidateSchema,
  memoryPatchCandidateSchema,
  type MemoryCandidate,
  type MemoryPatchCandidate,
} from "@/lib/memory/validation/contracts";
import {
  memoryValidationFailed,
  memoryValidationOk,
  type MemoryValidationError,
  type MemoryValidationResult,
} from "@/lib/memory/validation/result";

export type MemoryValidationContext = {
  userId: string;
  namespace: PandoraNamespace;
};

function parseErrors(error: { issues: Array<{ path: Array<string | number>; message: string }> }): MemoryValidationError[] {
  return error.issues.map((issue) => ({
    code: "invalid_payload",
    message: issue.message,
    path: issue.path.join("."),
  }));
}

function allowedTypesForNamespace(namespace: PandoraNamespace): readonly string[] {
  return namespace === "real_life" ? REAL_LIFE_MEMORY_TYPES : AU_MEMORY_TYPES;
}

function validateContextNamespace(context: MemoryValidationContext, namespace: PandoraNamespace): MemoryValidationError[] {
  if (context.namespace !== namespace) {
    return [
      {
        code: "namespace_mismatch",
        message: "Candidate namespace must match service context namespace.",
        details: { contextNamespace: context.namespace, candidateNamespace: namespace },
      },
    ];
  }

  return [];
}

function validateMemoryType(candidate: MemoryCandidate): MemoryValidationError[] {
  if (!allowedTypesForNamespace(candidate.namespace).includes(candidate.memory_type)) {
    return [
      {
        code: "unsupported_memory_type",
        message: "Memory type is not allowed for the candidate namespace.",
        details: { namespace: candidate.namespace, memoryType: candidate.memory_type },
      },
    ];
  }

  return [];
}

function validateSourceRules(candidate: MemoryCandidate): MemoryValidationError[] {
  const requiresSource =
    candidate.namespace === "real_life" &&
    (candidate.strength === "high" || candidate.strength === "locked" || candidate.confidence >= 0.85);

  if (requiresSource && candidate.sources.length === 0) {
    return [
      {
        code: "missing_required_source",
        message: "High-confidence real-life memory candidates require at least one source.",
      },
    ];
  }

  if (candidate.namespace === "au" && candidate.canon_status === "hard_canon" && candidate.sources.length === 0) {
    return [
      {
        code: "missing_required_source",
        message: "Hard-canon AU memory candidates require a source or conversation reference.",
      },
    ];
  }

  return [];
}

function warningRules(candidate: MemoryCandidate): MemoryValidationError[] {
  const warnings: MemoryValidationError[] = [];

  if (candidate.namespace === "real_life" && candidate.sources.length === 0) {
    warnings.push({
      code: "missing_required_source",
      message: "Real-life memory without a source should be treated as lower confidence.",
    });
  }

  if (candidate.namespace === "au" && candidate.memory_type === "contradiction" && candidate.canon_status !== "disputed") {
    warnings.push({
      code: "invalid_payload",
      message: "AU contradiction candidates should usually be marked disputed.",
    });
  }

  return warnings;
}

export function validateMemoryCandidate(
  context: MemoryValidationContext,
  input: unknown,
): MemoryValidationResult<MemoryCandidate> {
  const parsed = memoryCandidateSchema.safeParse(input);
  if (!parsed.success) {
    return memoryValidationFailed(parseErrors(parsed.error));
  }

  const candidate = parsed.data;
  const errors = [
    ...validateContextNamespace(context, candidate.namespace),
    ...validateMemoryType(candidate),
    ...validateSourceRules(candidate),
  ];
  const warnings = warningRules(candidate);

  if (errors.length > 0) {
    return memoryValidationFailed(errors, warnings);
  }

  return memoryValidationOk(candidate, warnings);
}

function validatePatchReason(candidate: MemoryPatchCandidate): MemoryValidationError[] {
  const patchTypeNeedsReason = candidate.patch_type !== "initial_create";

  if (patchTypeNeedsReason && !candidate.reason?.trim()) {
    return [
      {
        code: "missing_patch_reason",
        message: "Patch candidates that change existing memory require a reason.",
      },
    ];
  }

  return [];
}

function validatePatchShape(candidate: MemoryPatchCandidate): MemoryValidationError[] {
  if (candidate.patch_type !== "initial_create" && !candidate.before_snapshot) {
    return [
      {
        code: "unsafe_patch_shape",
        message: "Patch candidates for existing memory require a before snapshot.",
      },
    ];
  }

  return [];
}

export function validateMemoryPatchCandidate(
  context: MemoryValidationContext,
  input: unknown,
): MemoryValidationResult<MemoryPatchCandidate> {
  const parsed = memoryPatchCandidateSchema.safeParse(input);
  if (!parsed.success) {
    return memoryValidationFailed(parseErrors(parsed.error));
  }

  const candidate = parsed.data;
  const errors = [
    ...validateContextNamespace(context, candidate.namespace),
    ...validatePatchReason(candidate),
    ...validatePatchShape(candidate),
  ];

  if (errors.length > 0) {
    return memoryValidationFailed(errors);
  }

  return memoryValidationOk(candidate);
}
