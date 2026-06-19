export type RepositoryErrorCode =
  | "auth_required"
  | "namespace_mismatch"
  | "invalid_table"
  | "validation_failed"
  | "idempotency_conflict"
  | "not_found"
  | "database_error";

export type RepositoryError = {
  code: RepositoryErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RepositoryError };

export function repositoryOk<T>(data: T): RepositoryResult<T> {
  return { ok: true, data };
}

export function repositoryError(code: RepositoryErrorCode, message: string, details?: Record<string, unknown>): RepositoryResult<never> {
  return { ok: false, error: { code, message, details } };
}
