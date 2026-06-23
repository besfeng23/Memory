import type { ApprovedReviewPersistencePreviewInput, ApprovedReviewItemPlan } from "@/lib/services/approved-review-memory-persistence-preview-contract";
import { validateApprovedReviewForMemoryPreview } from "@/lib/services/approved-review-eligibility-validator";

export function buildApprovedReviewMemoryAppendPlan(input: ApprovedReviewPersistencePreviewInput) {
  const plans: ApprovedReviewItemPlan[] = input.items.map((item) => {
    const validation = validateApprovedReviewForMemoryPreview({ item, contextNamespace: input.context.namespace, targetNamespace: input.targetNamespace, clientUserId: input.clientUserId, client_user_id: input.client_user_id });
    const base = { itemId: item.id, eligible: validation.ok, blockers: validation.blockers, warnings: validation.warnings, namespaceSafety: validation.namespaceSafety, evidenceSafety: validation.evidenceSafety, wouldPersist: false as const, wouldCallModel: false as const, wouldEmbed: false as const };
    if (!validation.ok) return base;
    const reviewDecisionRef = item.audit.decisionTrail.at(-1)?.at ?? item.updatedAt;
    return { ...base,
      source: { kind: "memory_source_append", reviewItemId: item.id, userId: input.context.userId, namespace: item.namespace, sourceRef: item.sourceRef, sourceMetadata: item.sourceMetadata, reviewDecisionRef, appendOnly: true, wouldPersist: false },
      item: { kind: "memory_item_append", reviewItemId: item.id, userId: input.context.userId, namespace: item.namespace, candidateType: item.candidateType, content: item.normalizedText, evidence: validation.evidenceSafety, appendOnly: true, wouldPersist: false },
      patch: { kind: "memory_patch_append", reviewItemId: item.id, operation: "append", namespace: item.namespace, preservesCandidateContent: true, appendOnly: true, wouldPersist: false },
      auditLog: { kind: "audit_log_append", reviewItemId: item.id, actorUserId: input.context.userId, action: "approved_review_memory_persistence_previewed", appendOnly: true, wouldPersist: false },
    };
  });
  return { plans, wouldPersist: false as const, wouldCallModel: false as const, wouldEmbed: false as const };
}
