import type { MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";
import type { MemoryNamespace } from "@/lib/services/memory-extraction-contract";
import type { ApprovedReviewPersistenceBlocker, ApprovedReviewPersistenceWarning, EvidenceSafetySnapshot, NamespaceSafetySnapshot } from "@/lib/services/approved-review-memory-persistence-preview-contract";

type Input = { item: MemoryReviewQueueItem & { persistedAt?: string | null; memoryPersistedAt?: string | null; persistenceStatus?: string | null }; contextNamespace: MemoryNamespace; targetNamespace?: MemoryNamespace; clientUserId?: string; client_user_id?: string };
export function validateApprovedReviewForMemoryPreview(input: Input) {
  const { item } = input; const target = input.targetNamespace ?? item.namespace; const blockers: ApprovedReviewPersistenceBlocker[] = [];
  if (input.clientUserId || input.client_user_id) blockers.push("client_user_id_override_attempt");
  if (item.status !== "approved_for_append") blockers.push(item.status === "rejected" ? "rejected" : item.status === "needs_clarification" ? "needs_clarification" : item.status === "archived" ? "archived" : item.status === "blocked_sensitive" ? "blocked_sensitive" : item.status === "blocked_namespace_mismatch" ? "blocked_namespace_mismatch" : "not_approved_for_append");
  if (!item.appendOnly) blockers.push("append_only_required");
  if (item.proposedOperation !== "append") blockers.push("non_append_operation");
  if (!item.evidence?.hasEvidence || item.evidence.spans.length === 0) blockers.push("missing_evidence");
  if (item.namespace !== "real_life" && item.namespace !== "au") blockers.push("invalid_namespace");
  if (!item.sensitivity?.resolved) blockers.push("sensitivity_unresolved");
  if (item.status === "archived") blockers.push("archived");
  if (item.persistedAt || item.memoryPersistedAt || item.persistenceStatus === "persisted") blockers.push("already_persisted");
  if (item.namespace !== input.contextNamespace || target !== item.namespace) blockers.push("namespace_mismatch");
  if (item.namespaceIsolation.mixedContent) blockers.push("mixed_content_unresolved");
  if (item.namespace === "au" && target === "real_life") blockers.push("au_to_real_life_contamination");
  if (item.namespace === "real_life" && target === "au") blockers.push("real_life_to_au_contamination");
  const namespaceSafety: NamespaceSafetySnapshot = { sourceNamespace: item.namespace, targetNamespace: target, namespacePreserved: item.namespace === target, auCannotBecomeRealLifeEvidence: true, realLifeCannotEnterAuWithoutFictionalizedReview: true, explicitlyFictionalized: item.namespaceIsolation.explicitlyFictionalized, mixedContent: item.namespaceIsolation.mixedContent };
  const evidenceSafety: EvidenceSafetySnapshot = { hasEvidence: item.evidence.hasEvidence, spanCount: item.evidence.spans.length, evidencePreserved: true, candidateContentEdited: false, auStoryDataNeverRealLifeEvidence: true, realLifeDataNeverAuWithoutReview: true };
  const warnings: ApprovedReviewPersistenceWarning[] = ["preview_only", "approved_item_is_not_memory", "future_gate_required", "no_production_write", "namespace_preserved"];
  return { ok: blockers.length === 0, blockers: Array.from(new Set(blockers)), warnings, namespaceSafety, evidenceSafety, wouldPersist: false as const };
}
