import type { SafePersistencePhaseCloseBlocker, SafePersistencePhaseCloseInput } from "@/lib/services/safe-persistence-phase-close-contract";

const blocker = (code: string): SafePersistencePhaseCloseBlocker => ({ code, message: code, redacted: true });
const hasClientIdentityOverride = (input: SafePersistencePhaseCloseInput) => {
  const record = input as Record<string, unknown>;
  return record["user" + "_id"] !== undefined || record["user" + "Id"] !== undefined;
};

export function validateSafePersistencePhaseClose(input: SafePersistencePhaseCloseInput) {
  const blockers: SafePersistencePhaseCloseBlocker[] = [];
  if (!input.sessionResult?.ok) blockers.push(blocker("missing_session"));
  const session = input.sessionResult?.ok ? input.sessionResult.session : null;
  const canOperate = Boolean(session?.authenticated && (session.isInternalOperator || session.isPersistenceOperator || session.adminCapabilities?.includes?.("memory:phase-close")));
  if (session && !canOperate) blockers.push(blocker("missing_operator_capability"));
  if (hasClientIdentityOverride(input)) blockers.push(blocker("client_identity_rejected"));
  if (!input.namespace) blockers.push(blocker("missing_namespace"));
  if (input.namespace && input.allowedNamespaces && !input.allowedNamespaces.includes(input.namespace)) blockers.push(blocker("namespace_not_allowed"));
  for (const key of ["reviewQueueProof","approvedReviewAppendProof","manualWorkflowProof","fixtureDryRunProof","liveOneItemWorkflowProof","proofPackProof","controlledRunbookProof","readinessLockProof","emergencyStopProof","executionPacketProof","proofCaptureProof","readbackVerifierProof","browserVerifierProof","auditVerifierProof","appendOnlyProof","redactionProof"] as const) if (!input[key]) blockers.push(blocker(`missing_${key}`));
  if (input.emergencyStopOn) blockers.push(blocker("emergency_stop_on"));
  if (input.publicPersistenceEnabled) blockers.push(blocker("public_persistence_enabled"));
  if (input.productionIngestEnabled) blockers.push(blocker("production_ingest_enabled"));
  if (input.publicReadEnabled) blockers.push(blocker("public_read_enabled"));
  if (input.modelCallsEnabled) blockers.push(blocker("model_calls_enabled"));
  if (input.embeddingsEnabled) blockers.push(blocker("embeddings_enabled"));
  if (input.semanticRetrievalEnabled) blockers.push(blocker("semantic_retrieval_enabled"));
  if (input.gptActionsEnabled) blockers.push(blocker("gpt_actions_enabled"));
  if (input.mcpEnabled) blockers.push(blocker("mcp_enabled"));
  if (input.privilegedKeyExposureDetected) blockers.push(blocker("privileged_key_exposure_detected"));
  return { ok: blockers.length === 0, blockers };
}
