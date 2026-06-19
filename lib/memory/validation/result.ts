export type MemoryValidationErrorCode =
  | "invalid_payload"
  | "namespace_mismatch"
  | "unsupported_memory_type"
  | "missing_required_source"
  | "missing_patch_reason"
  | "unsafe_patch_shape";

export type MemoryValidationError = {
  code: MemoryValidationErrorCode;
  message: string;
  path?: string;
  details?: Record<string, unknown>;
};

export type MemoryValidationResult<T> =
  | { ok: true; data: T; warnings: MemoryValidationError[] }
  | { ok: false; errors: MemoryValidationError[]; warnings: MemoryValidationError[] };

export function memoryValidationOk<T>(data: T, warnings: MemoryValidationError[] = []): MemoryValidationResult<T> {
  return { ok: true, data, warnings };
}

export function memoryValidationFailed(
  errors: MemoryValidationError[],
  warnings: MemoryValidationError[] = [],
): MemoryValidationResult<never> {
  return { ok: false, errors, warnings };
}
