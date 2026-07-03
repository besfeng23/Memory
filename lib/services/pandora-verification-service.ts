/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AuditEvidenceItem, NamespaceVerificationSummary, PackMetadata, PandoraNamespace, PandoraVerificationData, RetrievalEvalSummary, VerificationStatus } from "@/components/pandora/types";

export type PandoraVerificationDbClient = { from: (table: string) => any };
type Row = Record<string, any>;
const namespaces: PandoraNamespace[] = ["real_life", "au"];
const archivedStatuses = new Set(["archived", "superseded"]);

async function readRows(client: PandoraVerificationDbClient, table: string, userId: string, warnings: string[], namespace?: PandoraNamespace, limit = 100): Promise<Row[]> {
  try {
    let query = client.from(table).select("*").eq("user_id", userId);
    if (namespace) query = query.eq("namespace", namespace);
    const result = await query.order("created_at", { ascending: false }).limit(limit);
    if (result.error) {
      warnings.push(`${table}${namespace ? `/${namespace}` : ""} read unavailable; verification shows safe empty state.`);
      return [];
    }
    return Array.isArray(result.data) ? result.data : [];
  } catch {
    warnings.push(`${table}${namespace ? `/${namespace}` : ""} read unavailable; verification shows safe empty state.`);
    return [];
  }
}

function asNamespace(value: unknown): PandoraNamespace | "unknown" {
  return value === "real_life" || value === "au" ? value : "unknown";
}

function packMeta(row: Row | undefined): PackMetadata | null {
  if (!row) return null;
  const namespace = asNamespace(row.namespace);
  if (namespace === "unknown") return null;
  return {
    id: String(row.id ?? "unknown"),
    namespace,
    packType: String(row.pack_type ?? "unknown"),
    status: String(row.status ?? "unknown"),
    title: String(row.title ?? row.id ?? "Untitled pack"),
    createdAt: String(row.created_at ?? "No created_at returned"),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    supersededAt: row.superseded_at ? String(row.superseded_at) : undefined,
  };
}

function worst(statuses: VerificationStatus[]): VerificationStatus {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("not_run")) return "not_run";
  return "pass";
}

function summarizeNamespace(namespace: PandoraNamespace, packs: Row[]): NamespaceVerificationSummary {
  const scoped = packs.filter((pack) => pack.namespace === namespace && pack.pack_type === "master");
  const active = scoped.filter((pack) => pack.status === "active");
  const archived = scoped.filter((pack) => archivedStatuses.has(String(pack.status ?? "")));
  const warnings: string[] = [];
  if (active.length === 0) warnings.push(`No active master pack returned for ${namespace}.`);
  if (active.length > 1) warnings.push(`${namespace} has ${active.length} active master packs; supersession needs review.`);
  if (archived.length === 0) warnings.push(`No previous archived/superseded master pack evidence returned for ${namespace}.`);
  return {
    namespace,
    status: active.length === 1 ? (archived.length > 0 ? "pass" : "warning") : "fail",
    activeMasterCount: active.length,
    archivedMasterCount: archived.length,
    newestActiveMaster: packMeta(active[0]),
    previousArchivedMaster: packMeta(archived[0]),
    duplicateActiveMasterIds: active.slice(1).map((pack) => String(pack.id ?? "unknown")),
    warnings,
  };
}

function auditItem(row: Row): AuditEvidenceItem {
  return { id: String(row.id ?? "unknown"), action: String(row.action ?? "unknown"), namespace: asNamespace(row.namespace), recordId: String(row.record_id ?? row.recordId ?? "unknown"), createdAt: String(row.created_at ?? "No created_at returned") };
}

function retrievalSummary(rows: Row[], warnings: string[]): RetrievalEvalSummary {
  if (warnings.some((warning) => warning.includes("retrieval_logs read unavailable"))) {
    return { status: "not_run", source: "retrieval_logs", latestRunId: null, latestRunAt: null, resultLabel: "Unavailable", realResultAvailable: false, warnings: ["Retrieval eval source could not be read; no score is shown."] };
  }
  const latest = rows[0];
  if (!latest) return { status: "not_run", source: "retrieval_logs", latestRunId: null, latestRunAt: null, resultLabel: "Not run", realResultAvailable: false, warnings: ["No retrieval eval/log rows returned for this operator."] };
  const label = latest.eval_result ?? latest.result ?? latest.status ?? latest.retrieval_service ?? "Real retrieval log row present; no score column returned";
  return { status: "pass", source: "retrieval_logs", latestRunId: String(latest.id ?? "unknown"), latestRunAt: String(latest.created_at ?? "No created_at returned"), resultLabel: String(label), realResultAvailable: true, warnings: [] };
}

export async function loadPandoraVerificationData(client: PandoraVerificationDbClient, input: { userId: string }): Promise<PandoraVerificationData> {
  const warnings: string[] = [];
  const [packRowsByNamespace, auditRows, retrievalRows] = await Promise.all([
    Promise.all(namespaces.map((namespace) => readRows(client, "memory_context_packs", input.userId, warnings, namespace, 100))),
    readRows(client, "audit_logs", input.userId, warnings, undefined, 50),
    readRows(client, "retrieval_logs", input.userId, warnings, undefined, 25),
  ]);
  const packs = packRowsByNamespace.flat().filter((pack) => namespaces.includes(pack.namespace));
  const namespaceSummaries = namespaces.map((namespace) => summarizeNamespace(namespace, packs));
  const crossNamespaceRows = packRowsByNamespace.flat().filter((pack) => pack.namespace !== "real_life" && pack.namespace !== "au");
  if (crossNamespaceRows.length) warnings.push("Unreadable or unexpected pack namespace values were excluded from verification.");
  const distillAudit = auditRows.filter((row) => row.action === "memory_context_pack_distilled").map(auditItem).slice(0, 10);
  const smokeRows = auditRows.filter((row) => ["first_live_append_proof_executed", "live_one_reviewed_item_executed", "operator_smoke_test_passed"].includes(String(row.action ?? ""))).map(auditItem);
  if (distillAudit.length === 0) warnings.push("No memory_context_pack_distilled audit evidence returned.");
  if (smokeRows.length === 0) warnings.push("No smoke evidence audit rows returned; smoke status is not_run.");
  const retrievalEval = retrievalSummary(retrievalRows, warnings);
  const duplicateCount = namespaceSummaries.reduce((sum, item) => sum + item.duplicateActiveMasterIds.length, 0);
  const exactlyOne = namespaceSummaries.every((item) => item.activeMasterCount === 1) ? "pass" : "fail";
  const noDuplicates = duplicateCount === 0 ? "pass" : "fail";
  const noCross = crossNamespaceRows.length === 0 ? "pass" : "fail";
  const smokeEvidence = { status: smokeRows.length ? "pass" as const : "not_run" as const, latest: smokeRows[0] ?? null, warnings: smokeRows.length ? [] : ["No smoke evidence exists for this operator session scope."] };
  const packStatus = worst(namespaceSummaries.map((item) => item.status));
  const status = worst([packStatus, retrievalEval.status, smokeEvidence.status, warnings.length ? "warning" : "pass"]);
  return {
    generatedAt: new Date().toISOString(),
    status,
    namespaces: namespaceSummaries,
    packSupersession: { status: packStatus, namespaces: namespaceSummaries, warnings: namespaceSummaries.flatMap((item) => item.warnings) },
    retrievalEval,
    auditEvidence: distillAudit,
    smokeEvidence,
    invariantStatus: { exactlyOneActiveMasterPerNamespace: exactlyOne, noCrossNamespacePackMixing: noCross, noDuplicateActiveMaster: noDuplicates, retrievalEvalHasNoFabricatedScore: "pass", smokeEvidence: smokeEvidence.status },
    warnings: Array.from(new Set([...warnings, ...retrievalEval.warnings, ...smokeEvidence.warnings])),
  };
}
