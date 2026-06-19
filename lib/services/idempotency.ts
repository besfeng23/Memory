import type { PandoraNamespace } from "@/lib/supabase/database.types";
import { repositoryError, repositoryOk, type RepositoryResult } from "@/lib/db/repository-result";

export type IdempotencyScope =
  | "memory_candidate"
  | "memory_patch"
  | "retrieval"
  | "custom";

export type IdempotencyInput = {
  userId: string;
  namespace: PandoraNamespace;
  scope: IdempotencyScope;
  operation: string;
  clientKey?: string | null;
  requestId?: string | null;
  payloadHash?: string | null;
};

export type IdempotencyContext = {
  userId: string;
  namespace: PandoraNamespace;
  scope: IdempotencyScope;
  operation: string;
  key: string;
  keySource: "client" | "request" | "payload";
  fingerprint: string;
};

const MAX_KEY_LENGTH = 200;
const SAFE_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/;

function normalizeKey(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function validateIdempotencyKey(value: string | null | undefined): RepositoryResult<string> {
  const normalized = normalizeKey(value);

  if (!normalized) {
    return repositoryError("validation_failed", "Idempotency key is required.");
  }

  if (normalized.length > MAX_KEY_LENGTH) {
    return repositoryError("validation_failed", "Idempotency key is too long.", {
      maxLength: MAX_KEY_LENGTH,
    });
  }

  if (!SAFE_KEY_PATTERN.test(normalized)) {
    return repositoryError("validation_failed", "Idempotency key contains unsupported characters.", {
      allowedPattern: SAFE_KEY_PATTERN.source,
    });
  }

  return repositoryOk(normalized);
}

function pickIdempotencyKey(input: IdempotencyInput): RepositoryResult<Pick<IdempotencyContext, "key" | "keySource">> {
  const clientKey = normalizeKey(input.clientKey);
  if (clientKey) {
    const validation = validateIdempotencyKey(clientKey);
    if (!validation.ok) {
      return validation;
    }

    return repositoryOk({ key: validation.data, keySource: "client" });
  }

  const requestId = normalizeKey(input.requestId);
  if (requestId) {
    const validation = validateIdempotencyKey(requestId);
    if (!validation.ok) {
      return validation;
    }

    return repositoryOk({ key: validation.data, keySource: "request" });
  }

  const payloadHash = normalizeKey(input.payloadHash);
  if (payloadHash) {
    const validation = validateIdempotencyKey(payloadHash);
    if (!validation.ok) {
      return validation;
    }

    return repositoryOk({ key: validation.data, keySource: "payload" });
  }

  return repositoryError("validation_failed", "Idempotency context requires a client key, request id, or payload hash.");
}

export function buildIdempotencyContext(input: IdempotencyInput): RepositoryResult<IdempotencyContext> {
  const operation = input.operation.trim();

  if (!operation) {
    return repositoryError("validation_failed", "Idempotency operation is required.");
  }

  const keyResult = pickIdempotencyKey(input);
  if (!keyResult.ok) {
    return keyResult;
  }

  const fingerprint = [
    `user:${input.userId}`,
    `namespace:${input.namespace}`,
    `scope:${input.scope}`,
    `operation:${operation}`,
    `key:${keyResult.data.key}`,
  ].join("|");

  return repositoryOk({
    userId: input.userId,
    namespace: input.namespace,
    scope: input.scope,
    operation,
    key: keyResult.data.key,
    keySource: keyResult.data.keySource,
    fingerprint,
  });
}
