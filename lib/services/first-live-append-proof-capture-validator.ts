import type { FirstLiveAppendProofCaptureBlocker, FirstLiveAppendProofCaptureInput, FirstLiveAppendProofCaptureResult } from "@/lib/services/first-live-append-proof-capture-contract";
const b = (code: string, message = code): FirstLiveAppendProofCaptureBlocker => ({ code, message, redacted: true });
const unsafe = /memoryText|memory text|evidenceText|evidence text|rawSourceBody|user_id|userId|raw user|idempotencyKey|raw idempotency|secret|service.?role|SUPABASE_SERVICE_ROLE|rawErrors|raw error|stack/i;
export function validateFirstLiveAppendProofCapture(input: FirstLiveAppendProofCaptureInput): FirstLiveAppendProofCaptureResult {
  const blockers: FirstLiveAppendProofCaptureBlocker[] = []; const s = input.sessionResult?.ok ? input.sessionResult.session : null; const p = input.packet; const r = input.workflowReceipt; const pr = input.proofReport;
  if (!input.sessionResult?.ok) blockers.push(b("missing_session"));
  if (!s?.authenticated) blockers.push(b("missing_authenticated_operator"));
  if (!s?.isInternalOperator && !s?.isPersistenceOperator && !s?.adminCapabilities?.includes("memory:first-live-append") && !s?.adminCapabilities?.includes("memory:proof-capture")) blockers.push(b("missing_operator_capability"));
  if (!input.namespace) blockers.push(b("missing_namespace"));
  if (input.namespace && !(input.allowedNamespaces ?? s?.allowedNamespaces ?? []).includes(input.namespace as never)) blockers.push(b("namespace_not_allowed"));
  if (input.user_id || input.userId) blockers.push(b("client_user_id_rejected"));
  if (!p) blockers.push(b("missing_execution_packet"));
  if (input.packetOneItemOnly === false || (p && p.safetySummary.oneItemOnly !== true)) blockers.push(b("packet_not_one_item_only"));
  if (input.packetPerformedPersistence === true || (p && p.safetySummary.performsPersistence !== false)) blockers.push(b("packet_claims_persistence_execution"));
  if (!r) blockers.push(b("missing_workflow_receipt")); else {
    if (!r.executionHappened) blockers.push(b("workflow_receipt_unexecuted"));
    if (p && r.namespace !== p.namespace) blockers.push(b("receipt_packet_namespace_mismatch"));
    if (p && r.reviewItemId !== p.reviewItemId) blockers.push(b("receipt_packet_review_item_mismatch"));
    if (p && r.decisionId !== p.decisionId) blockers.push(b("receipt_packet_decision_mismatch"));
    if (p && r.previewFingerprint !== p.previewFingerprint) blockers.push(b("preview_fingerprint_mismatch"));
    if (p && r.idempotencyFingerprint !== p.idempotencyFingerprint) blockers.push(b("idempotency_fingerprint_mismatch"));
    if (!r.memoryItemId) blockers.push(b("missing_memory_item_id"));
  }
  if (!pr) blockers.push(b("missing_proof_report")); else {
    if (r && (pr.receiptFingerprint !== r.receiptFingerprint || pr.namespace !== r.namespace || pr.memoryItemId !== r.memoryItemId)) blockers.push(b("proof_report_receipt_mismatch"));
    if (pr.readbackVerification !== "passed") blockers.push(b("readback_verification_failed"));
    if (pr.browserVerification !== "passed") blockers.push(b("browser_visibility_verification_failed"));
    if (pr.auditVerification !== "passed") blockers.push(b("audit_verification_failed"));
    if (pr.appendOnlyVerification !== "passed") blockers.push(b("append_only_verification_failed"));
  }
  for (const [key, code] of [["emergencyStopOn","emergency_stop_on"],["publicPersistenceEnabled","public_persistence_enabled"],["productionIngestEnabled","production_ingest_enabled"],["publicReadEnabled","public_read_enabled"],["modelCallsEnabled","model_calls_enabled"],["embeddingsEnabled","embeddings_enabled"],["semanticRetrievalEnabled","semantic_retrieval_enabled"],["gptActionsEnabled","gpt_actions_enabled"],["mcpEnabled","mcp_enabled"],["serviceRoleExposureDetected","service_role_exposure_detected"]] as const) if (input[key]) blockers.push(b(code));
  if (unsafe.test(JSON.stringify({ capturePackage: input.capturePackage, rawErrors: input.rawErrors }))) blockers.push(b("unsafe_capture_package_content_detected"));
  return { ok: blockers.length === 0, blocked: blockers.length > 0, blockers, warnings: [], performedPersistence: false, calledPublicRoute: false, calledModel: false, calledEmbeddings: false, calledSemanticRetrieval: false };
}
