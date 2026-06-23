import type { PersistedMemoryAuditDto, PersistedMemoryItemDto, PersistedMemoryPatchDto, PersistedMemorySourceDto } from "@/lib/services/persisted-memory-read-contract";
import type { OperatorMemoryQaFlowBlocker, OperatorMemoryQaFlowWarning } from "@/lib/services/operator-memory-qa-flow-contract";

type Input = { userId: string; namespace: string; reviewItemId: string; decisionId: string; idempotencyKey: string; previewFingerprint: string; item?: PersistedMemoryItemDto | null; sources?: PersistedMemorySourceDto[]; patches?: PersistedMemoryPatchDto[]; auditEvents?: PersistedMemoryAuditDto[]; plannedPatch?: boolean; targetNamespace?: string };
const has = (v?: string | null, needle?: string) => !!needle && !!v && v.includes(needle);
export function verifyOperatorMemoryReadback(input: Input): { ok: boolean; blockers: OperatorMemoryQaFlowBlocker[]; warnings: OperatorMemoryQaFlowWarning[] } {
  const blockers: OperatorMemoryQaFlowBlocker[] = []; const warnings: OperatorMemoryQaFlowWarning[] = [];
  const records = [input.item, ...(input.sources ?? []), ...(input.patches ?? []), ...(input.auditEvents ?? [])].filter(Boolean) as Array<{ namespace?: string | null; userId?: string; action?: string; patchType?: string; summary?: string; reviewItemId?: string | null; decisionId?: string | null; auditSummary?: string | null }>;
  if (!input.item) blockers.push({ code: "missing_memory_item", step: "memory_item_read_back", message: "Persisted memory item was not read back." });
  if (!(input.sources?.length)) blockers.push({ code: "missing_memory_source", step: "source_patch_audit_read_back", message: "Persisted memory source was not read back." });
  if (input.plannedPatch !== false && !(input.patches?.length)) blockers.push({ code: "missing_memory_patch", step: "source_patch_audit_read_back", message: "Planned memory patch was not read back." });
  if (!(input.auditEvents?.length) && !input.item?.auditSummary) blockers.push({ code: "missing_audit_trail", step: "source_patch_audit_read_back", message: "Audit trail is required for successful QA execution." });
  for (const r of records) {
    if (r.namespace !== input.namespace) blockers.push({ code: "namespace_mismatch", step: "source_patch_audit_read_back", message: "Readback record namespace did not match context namespace." });
    if (r.userId && r.userId !== input.userId) blockers.push({ code: "user_mismatch", step: "source_patch_audit_read_back", message: "Readback record user did not match server auth context." });
  }
  const text = JSON.stringify(records);
  for (const [code, value] of [["review_item_mismatch", input.reviewItemId], ["decision_mismatch", input.decisionId], ["idempotency_key_mismatch", input.idempotencyKey], ["preview_fingerprint_mismatch", input.previewFingerprint]] as const) if (!has(text, value)) blockers.push({ code, step: "source_patch_audit_read_back", message: `${code} in readback.` });
  if (input.namespace === "real_life" && /au_story|alternate_universe|fiction/i.test(text)) blockers.push({ code: "au_to_real_life_contamination", step: "source_patch_audit_read_back", message: "AU/story memory cannot become real-life evidence." });
  if (input.namespace !== "real_life" && /real[-_ ]life evidence/i.test(text) && !/fictionalized/i.test(text)) blockers.push({ code: "real_life_to_au_contamination", step: "source_patch_audit_read_back", message: "Real-life memory cannot enter AU unless fictionalized and reviewed." });
  if (/overwrite|delete|update/i.test(text)) blockers.push({ code: "non_append_operation", step: "source_patch_audit_read_back", message: "Readback included overwrite/delete/update operation." });
  if (input.targetNamespace && input.targetNamespace !== input.namespace) warnings.push({ code: "target_namespace_ignored", message: "QA readback stayed context namespace scoped." });
  return { ok: blockers.length === 0, blockers, warnings };
}
