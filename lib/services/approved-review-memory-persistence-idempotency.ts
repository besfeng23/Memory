import { createHash } from "crypto";
import type { RepositoryContext } from "@/lib/db/repository-context";

export type ApprovedReviewPersistenceIdempotencyInput = {
  context: Pick<RepositoryContext, "userId" | "namespace">;
  reviewItemId: string;
  decisionId: string;
  previewFingerprint: string;
};

function requirePart(name: string, value: string) {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${name} is required for approved-review persistence idempotency`);
  return trimmed;
}

export function buildApprovedReviewPersistenceIdempotencyKey(input: ApprovedReviewPersistenceIdempotencyInput) {
  const userId = requirePart("userId", input.context.userId);
  const namespace = requirePart("namespace", input.context.namespace);
  const reviewItemId = requirePart("reviewItemId", input.reviewItemId);
  const decisionId = requirePart("decisionId", input.decisionId);
  const previewFingerprint = requirePart("previewFingerprint", input.previewFingerprint);
  const digest = createHash("sha256").update(JSON.stringify({ userId, namespace, reviewItemId, decisionId, previewFingerprint })).digest("hex");
  return `approved-review-memory-persistence:v1:${digest}`;
}

export function validateApprovedReviewPersistenceIdempotencyKey(input: ApprovedReviewPersistenceIdempotencyInput & { idempotencyKey?: string | null }) {
  const expected = buildApprovedReviewPersistenceIdempotencyKey(input);
  if (!input.idempotencyKey || input.idempotencyKey !== expected) {
    return { ok: false as const, expected, error: "idempotency_key_mismatch" as const };
  }
  return { ok: true as const, expected };
}
