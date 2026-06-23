import { oneItemExecutionProofSafetySummary, type OneItemExecutionProofInput, type OneItemExecutionProofResult } from "@/lib/services/one-item-execution-proof-contract";
import { validateOneItemExecutionProofPreflight } from "@/lib/services/one-item-execution-proof-preflight";
import { buildOneItemExecutionProofReport, fingerprintOneItemExecutionProofValue } from "@/lib/services/one-item-execution-proof-report";

export async function runOneItemExecutionProof(input: OneItemExecutionProofInput): Promise<OneItemExecutionProofResult> {
  const pre = validateOneItemExecutionProofPreflight(input); if (!pre.ok) return pre;
  const r = input.liveWorkflowReceipt!; const blockers = [] as { code: string; message: string }[];
  const detail = await input.persistedMemoryReadRepository!.getMemoryItemDetail!(r.memoryItemId!); if (!JSON.stringify(detail).includes(r.memoryItemId!)) blockers.push({ code: "readback_not_verified", message: "readback_not_verified" });
  if (r.sourceId && input.persistedMemoryReadRepository!.getMemorySource) { const src = await input.persistedMemoryReadRepository!.getMemorySource(r.sourceId); if (!JSON.stringify(src).includes(r.sourceId)) blockers.push({ code: "source_not_verified", message: "source_not_verified" }); }
  let patchCount = r.patchCount; if (input.persistedMemoryReadRepository!.listMemoryPatches) { const p = await input.persistedMemoryReadRepository!.listMemoryPatches(r.memoryItemId!); patchCount = Array.isArray(p) ? p.length : r.patchCount; if (patchCount < r.patchCount) blockers.push({ code: "patches_not_verified", message: "patches_not_verified" }); }
  const a = await input.auditRepository!.listAuditEvents!(r.memoryItemId!); const auditEventCount = Array.isArray(a) ? a.length : r.auditEventCount; if (auditEventCount < r.auditEventCount) blockers.push({ code: "audit_not_verified", message: "audit_not_verified" });
  const b = await input.browserLoader!({ namespace: r.namespace, memoryItemId: r.memoryItemId!, sourceId: r.sourceId }); if (!JSON.stringify(b).includes(r.memoryItemId!)) blockers.push({ code: "browser_visibility_not_verified", message: "browser_visibility_not_verified" });
  const ok = blockers.length === 0;
  const report = ok ? buildOneItemExecutionProofReport({ ...input, patchCount, auditEventCount }) : undefined;
  return { ok, proofOnly: true, safety: oneItemExecutionProofSafetySummary, steps: pre.steps.map((s) => ({ ...s, status: ok ? "passed" : "blocked" })), blockers, warnings: [], report, receipt: report ? { proofId: report.proofId, namespace: report.namespace, workflowReceiptFingerprint: fingerprintOneItemExecutionProofValue(r), memoryItemId: report.memoryItemId, sourceId: report.sourceId, proofTimestamp: report.proofTimestamp, safety: oneItemExecutionProofSafetySummary } : undefined };
}
