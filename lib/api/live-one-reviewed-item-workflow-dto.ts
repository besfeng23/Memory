import type { LiveOneReviewedItemWorkflowResult } from "@/lib/services/live-one-reviewed-item-workflow-contract";
export function toLiveOneReviewedItemWorkflowSafeDto(result: LiveOneReviewedItemWorkflowResult) {
  return { ok: result.ok, executed: result.executed, safety: result.safety, readiness: result.readiness, steps: result.steps, blockers: result.blockers.map((b) => ({ code: b.code, step: b.step, message: b.message })), warnings: result.warnings.map((w) => ({ code: w.code, step: w.step, message: w.message })), receipt: result.receipt };
}
