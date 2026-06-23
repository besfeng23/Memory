import { oneItemExecutionProofStepNames, oneItemExecutionProofSafetySummary, type OneItemExecutionProofBlocker, type OneItemExecutionProofInput, type OneItemExecutionProofResult } from "@/lib/services/one-item-execution-proof-contract";

const unsafe = /\b(userId|user_id|idempotencyKey|memoryText|normalizedText|evidenceText|evidence|service-role|service_role|SUPABASE_SERVICE_ROLE|secret|raw error|stack)\b/i;
const block = (code: string, message = code): OneItemExecutionProofBlocker => ({ code, message });
export function validateOneItemExecutionProofPreflight(input: OneItemExecutionProofInput): OneItemExecutionProofResult {
  const blockers: OneItemExecutionProofBlocker[] = [];
  const s = input.sessionResult?.ok ? input.sessionResult.session : null;
  if (!input.sessionResult) blockers.push(block("missing_session"));
  if (!s?.authenticated) blockers.push(block("missing_authenticated_user"));
  if (!input.operatorCapability && !s?.isInternalOperator && !s?.isPersistenceOperator && !s?.adminCapabilities?.includes("memory:manual-workflow")) blockers.push(block("missing_operator_capability"));
  if (!input.namespace) blockers.push(block("missing_namespace"));
  if (input.namespace && input.allowedNamespaces?.length && !input.allowedNamespaces.includes(input.namespace)) blockers.push(block("namespace_not_allowed"));
  if (input.clientUserId || input.client_user_id || input.userId || input.user_id) blockers.push(block("client_user_id_rejected"));
  const c = input.runtime?.config;
  if (!c) blockers.push(block("missing_runtime_gates"));
  else {
    if (c.publicMemoryPersistenceEnabled) blockers.push(block("public_persistence_enabled"));
    if (c.ingestProductionWriteEnabled) blockers.push(block("production_ingest_enabled"));
    if (c.publicMemoryReadEnabled) blockers.push(block("public_read_enabled"));
    if (c.modelCallsEnabled) blockers.push(block("model_calls_enabled"));
    if (c.embeddingsEnabled) blockers.push(block("embeddings_enabled"));
    if (c.semanticRetrievalEnabled) blockers.push(block("semantic_retrieval_enabled"));
    if (c.gptActionsEnabled) blockers.push(block("gpt_actions_enabled"));
    if (c.mcpEnabled) blockers.push(block("mcp_enabled"));
  }
  const r = input.liveWorkflowReceipt;
  if (!r) blockers.push(block("missing_live_workflow_receipt"));
  else {
    if (r.executed === false || !r.memoryItemId) blockers.push(block("receipt_not_executed"));
    if (r.safety?.oneItemOnly !== true) blockers.push(block("receipt_not_one_item_only"));
    if (input.namespace && r.namespace !== input.namespace) blockers.push(block("namespace_mismatch"));
    if (!r.memoryItemId) blockers.push(block("missing_memory_item_id"));
    if (input.expectSource && !r.sourceId) blockers.push(block("missing_source_id"));
    if (!r.idempotencyFingerprint) blockers.push(block("missing_idempotency_fingerprint"));
    if (!r.previewFingerprint) blockers.push(block("missing_preview_fingerprint"));
    const text = JSON.stringify(r);
    if (unsafe.test(text)) blockers.push(block("unsafe_receipt_content"));
  }
  if (!input.persistedMemoryReadRepository?.getMemoryItemDetail) blockers.push(block("missing_readback_dependency"));
  if (!input.browserLoader) blockers.push(block("missing_browser_verification_dependency"));
  if (!input.auditRepository?.listAuditEvents) blockers.push(block("missing_audit_verification_dependency"));
  return { ok: blockers.length === 0, proofOnly: true, safety: oneItemExecutionProofSafetySummary, steps: oneItemExecutionProofStepNames.map((name) => ({ name, status: blockers.length ? "blocked" : "passed" })), blockers, warnings: [] };
}
