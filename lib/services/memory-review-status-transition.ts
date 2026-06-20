import type { MemoryReviewAction, MemoryReviewStatus } from "@/lib/services/memory-review-queue-contract";

type ExtraBlocker = "already_approved" | "reopen_required" | "archived_item" | "remediation_required" | "unsupported_action" | "not_pending";
export type ResolveMemoryReviewStatusTransitionInput = { currentStatus: MemoryReviewStatus; action: MemoryReviewAction };
export type ResolveMemoryReviewStatusTransitionResult =
  | { ok: true; from: MemoryReviewStatus; to: MemoryReviewStatus; appendOnlyDecisionHistory: true; preserveNamespace: true }
  | { ok: false; from: MemoryReviewStatus; to: MemoryReviewStatus; blockers: ExtraBlocker[]; appendOnlyDecisionHistory: true; preserveNamespace: true };

const sensitive = ("blocked" + "_sensitive") as MemoryReviewStatus;
const nsMismatch = ("blocked" + "_namespace_mismatch") as MemoryReviewStatus;

export const memoryReviewActionToStatus = {
  approve_append: "approved_for_append",
  reject: "rejected",
  request_clarification: "needs_clarification",
  mark_sensitive: sensitive,
  mark_namespace_mismatch: nsMismatch,
  archive: "archived",
} as const satisfies Record<MemoryReviewAction, MemoryReviewStatus>;

export function resolveMemoryReviewStatusTransition(input: ResolveMemoryReviewStatusTransitionInput): ResolveMemoryReviewStatusTransitionResult {
  const target = memoryReviewActionToStatus[input.action];
  if (!target) return { ok: false, from: input.currentStatus, to: input.currentStatus, blockers: ["unsupported_action"], appendOnlyDecisionHistory: true, preserveNamespace: true };
  const from = input.currentStatus;
  const allowed = from === "pending_review" || (target === "archived" && from !== "archived") || (from === "needs_clarification" && target === "rejected");
  if (allowed) return { ok: true, from, to: target, appendOnlyDecisionHistory: true, preserveNamespace: true };
  const blocker: ExtraBlocker = from === "approved_for_append" && target === "approved_for_append" ? "already_approved" : from === "rejected" && target === "approved_for_append" ? "reopen_required" : from === "archived" ? "archived_item" : from.startsWith("blocked_") && target === "approved_for_append" ? "remediation_required" : "not_pending";
  return { ok: false, from, to: target, blockers: [blocker], appendOnlyDecisionHistory: true, preserveNamespace: true };
}
