import type { MemoryReviewQueueItem } from "@/lib/services/memory-review-queue-contract";
import type { ApprovedReviewPersistencePreviewResult } from "@/lib/services/approved-review-memory-persistence-preview-contract";
import type { AdminPersistencePermissionResult } from "@/lib/security/admin-persistence-permissions";

const safety = { publicPersistenceEnabled: false, productionIngestEnabled: false, requiresInternalGate: true } as const;
export type ReviewItemSafeDto = typeof safety & { id: string; status: string; namespace: string; candidateType: string; candidatePreview: string; evidenceSummary: { hasEvidence: boolean; spanCount: number }; appendOnly: boolean };
export type PreviewSafeDto = typeof safety & { ok: boolean; wouldPersist: false; planCount: number; blockers: string[]; warnings: string[] };
export type GateSafeDto = typeof safety & { allowed: boolean; blockers: string[]; namespace?: string };
export type ExecutionResultSafeDto = typeof safety & { executed: boolean; appendOnly: true; auditRequired: true; blockers?: string[] };
export type AuditSummaryDto = typeof safety & { userId: string; namespace: string; reviewItemId: string; decisionId: string; idempotencyKey: string; previewFingerprint: string; appendOnly: true };
export type BlockedResultDto = typeof safety & { ok: false; executed?: false; message: string; blockers: string[] };
export function toReviewItemSafeDto(item: MemoryReviewQueueItem, previewLength = 120): ReviewItemSafeDto { return { ...safety, id: item.id, status: item.status, namespace: item.namespace, candidateType: item.candidateType, candidatePreview: item.normalizedText.slice(0, previewLength), evidenceSummary: { hasEvidence: item.evidence.hasEvidence, spanCount: item.evidence.spanRanges.length }, appendOnly: item.appendOnly }; }
export function toPreviewSafeDto(preview: ApprovedReviewPersistencePreviewResult): PreviewSafeDto { return { ...safety, ok: preview.ok, wouldPersist: false, planCount: preview.plans.length, blockers: preview.blockers, warnings: preview.warnings }; }
export function toGateSafeDto(gate: AdminPersistencePermissionResult): GateSafeDto { return { ...safety, allowed: gate.allowed, blockers: gate.blockers, namespace: gate.namespace }; }
export function toExecutionResultSafeDto(result: { executed?: boolean; blockers?: string[] }): ExecutionResultSafeDto { return { ...safety, executed: result.executed === true, appendOnly: true, auditRequired: true, blockers: result.blockers }; }
export function blockedResult(message: string, blockers: string[]): BlockedResultDto { return { ...safety, ok: false, executed: false, message, blockers }; }
