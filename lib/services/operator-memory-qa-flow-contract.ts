import type { RepositoryContext } from "@/lib/db/repository-context";
import type { MemoryNamespace } from "@/lib/services/memory-extraction-contract";

export type OperatorMemoryQaFlowStepName = "review_item_loaded" | "decision_verified" | "preview_plan_built" | "internal_gate_checked" | "persistence_executed" | "memory_item_read_back" | "source_patch_audit_read_back" | "browser_view_model_verified";
export type OperatorMemoryQaFlowStep = { name: OperatorMemoryQaFlowStepName; status: "pending" | "passed" | "blocked"; message?: string };
export type OperatorMemoryQaFlowBlocker = { code: string; step?: OperatorMemoryQaFlowStepName; message: string };
export type OperatorMemoryQaFlowWarning = { code: string; step?: OperatorMemoryQaFlowStepName; message: string };
export type OperatorMemoryQaFlowSafetyState = { internalOnly: true; publicIngestEnabled: false; publicPersistenceEnabled: false; publicMemoryReadEnabled: false; wouldCallModel: false; wouldEmbed: false; semanticRetrievalEnabled: false; appendOnly: true };
export const operatorMemoryQaSafety: OperatorMemoryQaFlowSafetyState = { internalOnly: true, publicIngestEnabled: false, publicPersistenceEnabled: false, publicMemoryReadEnabled: false, wouldCallModel: false, wouldEmbed: false, semanticRetrievalEnabled: false, appendOnly: true };
export type OperatorMemoryQaFlowReadbackSummary = { itemId?: string; sourceId?: string; patchId?: string; auditEventId?: string; auditSummaryExists: boolean; browserVisible: boolean; namespace: MemoryNamespace; reviewItemId: string; decisionId: string; idempotencyKeyFingerprint: string; previewFingerprint: string };
export type OperatorMemoryQaFlowInput = { context?: RepositoryContext; namespace?: MemoryNamespace; reviewItemId?: string; decisionId?: string; idempotencyKey?: string; previewFingerprint?: string; clientUserId?: string; client_user_id?: string; userId?: string; user_id?: string };
export type OperatorMemoryQaFlowResult = OperatorMemoryQaFlowSafetyState & { ok: boolean; executed: boolean; namespace?: MemoryNamespace; reviewItemId?: string; decisionId?: string; idempotencyKeyFingerprint?: string; steps: OperatorMemoryQaFlowStep[]; blockers: OperatorMemoryQaFlowBlocker[]; warnings: OperatorMemoryQaFlowWarning[]; readback?: OperatorMemoryQaFlowReadbackSummary };
export const operatorMemoryQaStepNames: OperatorMemoryQaFlowStepName[] = ["review_item_loaded", "decision_verified", "preview_plan_built", "internal_gate_checked", "persistence_executed", "memory_item_read_back", "source_patch_audit_read_back", "browser_view_model_verified"];
