import type { MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";
import type { ReviewQueueDecisionRecord } from "@/lib/db/memory-review-queue-repository-contract";
import { liveOneReviewedItemWorkflowSafetySummary, liveOneReviewedItemWorkflowStepNames, type LiveOneReviewedItemWorkflowBlocker, type LiveOneReviewedItemWorkflowInput, type LiveOneReviewedItemWorkflowResult, type LiveOneReviewedItemWorkflowStepName } from "@/lib/services/live-one-reviewed-item-workflow-contract";

export type LiveOneReviewedItemWorkflowPreflightInput = LiveOneReviewedItemWorkflowInput & { reviewItem?: MemoryReviewQueueItem | null; decision?: ReviewQueueDecisionRecord | null; approvedReviewPersistenceExecutor?: unknown; persistedMemoryReadRepository?: unknown; browserLoader?: unknown; auditVerifier?: unknown };
const add = (xs: LiveOneReviewedItemWorkflowBlocker[], step: LiveOneReviewedItemWorkflowStepName, code: string, message: string) => xs.push({ step, code, message });
export function validateLiveOneReviewedItemWorkflowPreflight(input: LiveOneReviewedItemWorkflowPreflightInput): LiveOneReviewedItemWorkflowResult {
  const blockers: LiveOneReviewedItemWorkflowBlocker[] = [];
  if (!input.sessionResult?.ok && !input.context?.userId) add(blockers, "server_session_resolved", "missing_session", "Server session is required.");
  if (!input.sessionResult?.ok && !input.context?.userId) add(blockers, "server_session_resolved", "missing_authenticated_user", "Authenticated server user is required.");
  if (input.clientUserId || input.client_user_id || input.userId || input.user_id) add(blockers, "server_session_resolved", "client_user_id_rejected", "Client-supplied user_id/userId is rejected.");
  if (!input.operatorCapability) add(blockers, "internal_operator_capability_verified", "missing_operator_capability", "Internal/admin/operator capability is required.");
  if (!input.namespace) add(blockers, "namespace_verified", "missing_namespace", "Namespace is required.");
  if (input.namespace && input.allowedNamespaces && !input.allowedNamespaces.includes(input.namespace)) add(blockers, "namespace_verified", "namespace_not_allowed", "Namespace is not allowed.");
  const c = input.runtime?.config;
  if (!c) add(blockers, "runtime_gates_resolved", "missing_runtime_gates", "Runtime gates are required.");
  else {
    if (c.publicMemoryPersistenceEnabled) add(blockers, "runtime_gates_resolved", "public_persistence_enabled", "Public persistence must be disabled.");
    if (c.ingestProductionWriteEnabled) add(blockers, "runtime_gates_resolved", "production_ingest_enabled", "Production ingest writes must be disabled.");
    if (c.publicMemoryReadEnabled) add(blockers, "runtime_gates_resolved", "public_read_enabled", "Public reads must be disabled.");
    if (c.modelCallsEnabled) add(blockers, "runtime_gates_resolved", "model_calls_enabled", "Model calls must be disabled.");
    if (c.embeddingsEnabled) add(blockers, "runtime_gates_resolved", "embeddings_enabled", "Embeddings must be disabled.");
    if (c.semanticRetrievalEnabled) add(blockers, "runtime_gates_resolved", "semantic_retrieval_enabled", "Semantic retrieval must be disabled.");
    if (c.gptActionsEnabled) add(blockers, "runtime_gates_resolved", "gpt_actions_enabled", "GPT Actions must be disabled.");
    if (c.mcpEnabled) add(blockers, "runtime_gates_resolved", "mcp_enabled", "MCP must be disabled.");
    if (!c.approvedReviewPersistenceEnabled) add(blockers, "runtime_gates_resolved", "approved_review_persistence_gate_disabled", "Approved-review persistence gate is required.");
    if (!c.adminPersistenceConsoleEnabled) add(blockers, "runtime_gates_resolved", "admin_persistence_gate_disabled", "Admin/operator persistence gate is required.");
  }
  if (!input.reviewItem) add(blockers, "review_item_loaded", "missing_review_item", "Review item is required.");
  if (input.reviewItem && input.reviewItem.status !== "approved_for_append") add(blockers, "review_item_approved_for_append", "review_item_not_approved", "Review item must be approved_for_append.");
  if (input.reviewItem && input.namespace && input.reviewItem.namespace !== input.namespace) add(blockers, "namespace_verified", "namespace_mismatch", "Review item namespace must match requested namespace.");
  if (!input.decision) add(blockers, "append_decision_loaded", "missing_append_decision", "Append decision is required.");
  if (input.decision && input.decision.action !== "approve_append") add(blockers, "append_decision_loaded", "non_append_decision", "Decision must be approve_append.");
  if (input.decision && input.reviewItem && input.decision.itemId !== input.reviewItem.id) add(blockers, "append_decision_loaded", "decision_item_mismatch", "Decision must belong to review item.");
  const plan = input.preview?.plans.find((p) => p.itemId === input.reviewItem?.id);
  if (!input.preview) add(blockers, "preview_built", "missing_preview", "Preview is required.");
  else if (!input.preview.ok || !plan?.eligible) add(blockers, "preview_built", "ineligible_preview", "Preview must be eligible.");
  if (!input.idempotencyKey) add(blockers, "idempotency_verified", "missing_idempotency_key", "Idempotency key is required.");
  if (input.typedConfirmation !== "APPEND MEMORY") add(blockers, "typed_confirmation_verified", "typed_confirmation_mismatch", "Typed confirmation must exactly equal APPEND MEMORY.");
  if (input.internalHeaderMode !== "approved-review-executor") add(blockers, "approved_review_executor_selected", "missing_internal_header", "Internal approved-review executor header is required.");
  if (!input.approvedReviewPersistenceExecutor) add(blockers, "approved_review_executor_selected", "missing_executor_dependency", "Executor dependency is required.");
  if (!input.persistedMemoryReadRepository) add(blockers, "readback_verified", "missing_readback_dependency", "Readback dependency is required.");
  if (!input.browserLoader) add(blockers, "browser_visibility_verified", "missing_browser_loader_dependency", "Browser loader dependency is required.");
  if (!input.auditVerifier) add(blockers, "audit_verified", "missing_audit_verification_dependency", "Audit verification dependency is required.");
  return { ok: blockers.length === 0, executed: false, safety: liveOneReviewedItemWorkflowSafetySummary, steps: liveOneReviewedItemWorkflowStepNames.map((name) => ({ name, status: blockers.some((b) => b.step === name) ? "blocked" : "pending", message: blockers.find((b) => b.step === name)?.message })), blockers, warnings: [], readiness: { ok: blockers.length === 0, gatesAvailable: blockers.length === 0, disabledByDefault: true, blockers: blockers.map((b) => b.code) } };
}
