import type { MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";
import type { ReviewQueueDecisionRecord } from "@/lib/db/memory-review-queue-repository-contract";
import { operatorManualMemoryWorkflowSafetySummary, operatorManualMemoryWorkflowStepNames, type OperatorManualMemoryWorkflowBlocker, type OperatorManualMemoryWorkflowInput, type OperatorManualMemoryWorkflowResult, type OperatorManualMemoryWorkflowStepName } from "@/lib/services/operator-manual-memory-workflow-contract";

export type OperatorManualMemoryWorkflowPreflightInput = OperatorManualMemoryWorkflowInput & { reviewItem?: MemoryReviewQueueItem | null; decision?: ReviewQueueDecisionRecord | null };
const b = (blockers: OperatorManualMemoryWorkflowBlocker[], step: OperatorManualMemoryWorkflowStepName, code: string, message: string) => blockers.push({ step, code, message });
export function validateOperatorManualMemoryWorkflowPreflight(input: OperatorManualMemoryWorkflowPreflightInput): OperatorManualMemoryWorkflowResult {
  const blockers: OperatorManualMemoryWorkflowBlocker[] = [];
  if (!input.sessionResult?.ok && !input.context?.userId) b(blockers, "server_session_resolved", "auth_required", "Authenticated server session is required.");
  if (input.clientUserId || input.client_user_id || input.userId || input.user_id) b(blockers, "server_session_resolved", "client_user_id_rejected", "Client-supplied user_id/userId is rejected.");
  if (!input.namespace) b(blockers, "namespace_validated", "namespace_required", "Explicit namespace is required.");
  if (input.namespace && input.allowedNamespaces && !input.allowedNamespaces.includes(input.namespace)) b(blockers, "namespace_validated", "namespace_not_allowed", "Namespace is not allowed for this operator.");
  const c = input.runtime?.config;
  if (!c) b(blockers, "runtime_gates_resolved", "runtime_gates_required", "Runtime gates must be resolved.");
  else {
    if (!c.adminPersistenceConsoleEnabled || !c.approvedReviewPersistenceEnabled) b(blockers, "runtime_gates_resolved", "internal_persistence_gates_disabled", "Explicit internal approved-review persistence gates are required.");
    if (c.publicMemoryPersistenceEnabled) b(blockers, "runtime_gates_resolved", "public_persistence_enabled", "Public persistence must remain disabled.");
    if (c.ingestProductionWriteEnabled) b(blockers, "runtime_gates_resolved", "production_ingest_write_enabled", "Production ingest writes must remain disabled.");
    for (const [k, code] of [[c.modelCallsEnabled, "model_calls_enabled"], [c.embeddingsEnabled, "embeddings_enabled"], [c.semanticRetrievalEnabled, "semantic_retrieval_enabled"], [c.gptActionsEnabled, "gpt_actions_enabled"], [c.mcpEnabled, "mcp_enabled"]] as const) if (k) b(blockers, "runtime_gates_resolved", code, "Model/embedding/retrieval/GPT/MCP gates must remain disabled.");
  }
  if (!input.readinessResult?.ok) b(blockers, "readiness_checked", "readiness_not_passed", "Operator readiness must pass.");
  if (!input.liveDryRunResult?.ok) b(blockers, "live_dry_run_checked", "live_dry_run_not_passed", "Operator live dry-run must pass.");
  if (!input.reviewItemId) b(blockers, "review_item_loaded", "missing_review_item_id", "Review item id is required.");
  if (!input.decisionId) b(blockers, "append_decision_verified", "missing_decision_id", "Decision id is required.");
  if (input.reviewItem && input.reviewItem.status !== "approved_for_append") b(blockers, "review_item_loaded", "review_item_not_approved", "Review item must be approved_for_append.");
  if (!input.decision) b(blockers, "append_decision_verified", "missing_append_decision", "Append decision is required.");
  else if (input.decision.action !== "approve_append" || input.decision.itemId !== input.reviewItemId) b(blockers, "append_decision_verified", "non_append_decision", "Decision must be append-only approve_append for this item.");
  const plan = input.preview?.plans.find((p) => p.itemId === input.reviewItemId);
  if (!input.preview || !input.preview.ok || !plan?.eligible) b(blockers, "persistence_preview_built", "invalid_preview_plan", "A valid eligible preview plan is required.");
  if (!input.idempotencyKey) b(blockers, "idempotency_key_verified", "missing_idempotency_key", "Idempotency key is required.");
  if (input.typedConfirmation !== "APPEND MEMORY") b(blockers, "typed_confirmation_verified", "typed_confirmation_mismatch", "Typed confirmation must equal APPEND MEMORY.");
  if (!input.adminCapability && !input.sessionResult?.ok) b(blockers, "internal_execution_gate_verified", "operator_capability_required", "Admin/operator capability is required.");
  if (!input.internalExecutionGate || input.internalHeaderMode !== "approved-review-executor") b(blockers, "internal_execution_gate_verified", "internal_gate_required", "Internal persistence header/gate is required.");
  return { ok: blockers.length === 0, executed: false, safety: operatorManualMemoryWorkflowSafetySummary, steps: operatorManualMemoryWorkflowStepNames.map((name) => ({ name, status: blockers.some((x) => x.step === name) ? "blocked" : "pending", message: blockers.find((x) => x.step === name)?.message })), blockers, warnings: [] };
}
