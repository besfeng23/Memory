import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import type { PandoraServerSessionResult } from "@/lib/auth/pandora-server-session-contract";

type QueryError = { message?: string } | null;
type QueryResult<T> = Promise<{ data: T | null; error: QueryError }>;
type LooseSelectBuilder = { eq(column: string, value: string): LooseSelectBuilder; order(column: string, options: { ascending: boolean }): LooseSelectBuilder; limit(count: number): QueryResult<Record<string, unknown>[]>; maybeSingle(): QueryResult<Record<string, unknown>> };
type LooseDbClient = { from(table: string): { insert(values: Record<string, unknown>): { select(columns: string): { single(): QueryResult<Record<string, unknown>> } }; select(columns: string): LooseSelectBuilder } };
type Payload = Record<string, unknown>;

const disabled = { ok: false, executed: false, internalOnly: true, oneItemOnly: true, publicPersistenceEnabled: false, productionIngestEnabled: false, publicReadEnabled: false, message: "Live one-item memory workflow is disabled by default and requires internal operator wiring.", blockers: ["live_one_item_workflow_disabled", "internal_admin_gate_required"] };

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function isRecord(value: unknown): value is Payload { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function containsClientIdentity(value: unknown): boolean { if (!value || typeof value !== "object") return false; if (Array.isArray(value)) return value.some(containsClientIdentity); const record = value as Record<string, unknown>; if (["user_id", "userId", "client_user_id", "clientUserId"].some((key) => Object.prototype.hasOwnProperty.call(record, key))) return true; return Object.values(record).some(containsClientIdentity); }
function fingerprint(value: unknown) { const input = JSON.stringify(value ?? ""); let hash = 2166136261; for (let i = 0; i < input.length; i += 1) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); } return `fp_${(hash >>> 0).toString(36)}`; }
function bad(blockers: string[], status: number, gates: unknown) { return NextResponse.json({ ...disabled, blockers: Array.from(new Set(blockers)), gates }, { status }); }
function safeMetadata(value: unknown) { if (!isRecord(value)) return {}; if (containsClientIdentity(value)) return { rejectedNestedIdentity: true }; return value; }

async function readback(db: LooseDbClient, table: string, input: { id: string; userId: string; namespace: string }) { const result = await db.from(table).select("id").eq("id", input.id).eq("user_id", input.userId).eq("namespace", input.namespace).maybeSingle(); return Boolean(result.data && !result.error); }
async function listContains(db: LooseDbClient, input: { id: string; userId: string; namespace: string }) { const result = await db.from("memory_items").select("id").eq("user_id", input.userId).eq("namespace", input.namespace).order("created_at", { ascending: false }).limit(25); return Boolean((result.data ?? []).some((row) => row.id === input.id) && !result.error); }

export async function runFirstLiveAppendDirectProof(input: { request: NextRequest; payload: Payload; env: NodeJS.ProcessEnv; gates: unknown; sessionResult: PandoraServerSessionResult }) {
  const blockers: string[] = [];
  const runtime = resolvePandoraRuntimeSafetyConfig(input.env);
  const caps = input.sessionResult.ok ? input.sessionResult.session : null;
  const namespace = text(input.payload.namespace);
  const reviewItemId = text(input.payload.reviewItemId);
  const decisionId = text(input.payload.decisionId);
  const idempotencyKey = text(input.payload.idempotencyKey);
  const typedConfirmation = text(input.payload.typedConfirmation);
  const content = text(input.payload.memoryText) || text(input.payload.input);
  const title = text(input.payload.title) || "First controlled live append proof";
  const sourceRef = text(input.payload.sourceRef) || `review:${reviewItemId}`;
  const operatorToken = input.env.PANDORA_INTERNAL_OPERATOR_TOKEN;
  const operatorHeader = input.request.headers.get("x-pandora-internal-operator-token") ?? "";

  if (!caps?.authenticated) blockers.push("missing_authenticated_server_user");
  if (!operatorToken || operatorHeader !== operatorToken) blockers.push("internal_operator_token_required");
  if (namespace !== "real_life" && namespace !== "au") blockers.push("missing_namespace");
  if (Array.isArray(input.payload.reviewItemIds) || Array.isArray(input.payload.decisionIds)) blockers.push("multiple_items_forbidden");
  if (!reviewItemId) blockers.push("missing_review_item_id");
  if (!decisionId) blockers.push("missing_decision_id");
  if (idempotencyKey.length < 8) blockers.push("missing_idempotency_key");
  if (typedConfirmation !== "APPEND MEMORY") blockers.push("typed_confirmation_mismatch");
  if (!content) blockers.push("missing_memory_text");
  if (content.length > 4000) blockers.push("memory_text_too_long_for_first_proof");
  if (input.request.headers.get("x-pandora-internal-persistence-mode") !== "approved-review-executor") blockers.push("missing_internal_header");
  if (!runtime.config.approvedReviewPersistenceEnabled) blockers.push("approved_review_persistence_gate_disabled");
  if (!runtime.config.adminPersistenceConsoleEnabled) blockers.push("admin_persistence_gate_disabled");
  if (runtime.config.publicMemoryPersistenceEnabled || runtime.config.ingestProductionWriteEnabled || runtime.config.publicMemoryReadEnabled) blockers.push("unsafe_public_or_ingest_gate_enabled");
  if (runtime.config.modelCallsEnabled) blockers.push("model_calls_must_remain_disabled");
  if (runtime.config.embeddingsEnabled) blockers.push("embeddings_must_remain_disabled");
  if (runtime.config.semanticRetrievalEnabled) blockers.push("semantic_retrieval_must_remain_disabled");
  if (runtime.config.gptActionsEnabled) blockers.push("gpt_actions_must_remain_disabled");
  if (runtime.config.mcpEnabled) blockers.push("mcp_must_remain_disabled");
  if (containsClientIdentity(input.payload)) blockers.push("client_user_id_rejected");
  if (blockers.length) return bad(blockers, 403, input.gates);

  const db = (await createSupabaseServerClient()) as unknown as LooseDbClient;
  const now = new Date().toISOString();
  const contentFingerprint = fingerprint(content);
  const idempotencyFingerprint = fingerprint(idempotencyKey);
  const userId = caps!.userId;

  const item = await db.from("memory_items").insert({ user_id: userId, namespace, memory_type: "observation", title, body: content, strength: "medium", confidence: 1, canon_status: "draft", source_summary: "first controlled live append proof", metadata: { reviewItemId, decisionId, proofOnly: true, oneItemOnly: true, appendOnly: true, contentFingerprint, rawContentRedactedFromProof: true, operatorMetadata: safeMetadata(input.payload.metadata) }, created_at: now, updated_at: now }).select("id,created_at").single();
  if (item.error || !item.data?.id) return bad(["memory_item_append_failed"], 500, input.gates);
  const memoryItemId = String(item.data.id);

  const source = await db.from("memory_sources").insert({ user_id: userId, namespace, memory_item_id: memoryItemId, source_type: "manual_admin_entry", source_ref: sourceRef, excerpt: null, confidence: 1, metadata: { reviewItemId, decisionId, proofOnly: true, oneItemOnly: true, appendOnly: true }, created_at: now }).select("id").single();
  if (source.error || !source.data?.id) return bad(["memory_source_append_failed"], 500, input.gates);
  const sourceId = String(source.data.id);

  const patch = await db.from("memory_patches").insert({ user_id: userId, namespace, memory_item_id: memoryItemId, patch_type: "ingest_append", reason: "first controlled live append proof", before_snapshot: null, after_snapshot: { memoryItemId, sourceId, reviewItemId, decisionId, appendOnly: true, contentRedacted: true }, metadata: { proofOnly: true, oneItemOnly: true, idempotencyFingerprint }, created_at: now }).select("id").single();
  if (patch.error || !patch.data?.id) return bad(["memory_patch_append_failed"], 500, input.gates);
  const patchId = String(patch.data.id);

  const audit = await db.from("audit_logs").insert({ user_id: userId, namespace, action: "first_live_append_proof_executed", table_name: "memory_items", record_id: memoryItemId, before_snapshot: null, after_snapshot: { memoryItemId, sourceId, patchId, reviewItemId, decisionId, appendOnly: true, contentRedacted: true }, metadata: { proofOnly: true, oneItemOnly: true, idempotencyFingerprint }, created_at: now }).select("id").single();
  if (audit.error || !audit.data?.id) return bad(["audit_log_append_failed"], 500, input.gates);
  const auditLogId = String(audit.data.id);

  const readbackVerified = await readback(db, "memory_items", { id: memoryItemId, userId, namespace });
  const browserVisible = await listContains(db, { id: memoryItemId, userId, namespace });
  const auditVerified = await readback(db, "audit_logs", { id: auditLogId, userId, namespace });
  const proofBlockers = [readbackVerified ? null : "readback_failed", browserVisible ? null : "browser_visibility_failed", auditVerified ? null : "audit_verification_failed"].filter((value): value is string => Boolean(value));
  const receiptFingerprint = fingerprint({ memoryItemId, sourceId, patchId, auditLogId, reviewItemId, decisionId, idempotencyFingerprint });

  return NextResponse.json({ ok: proofBlockers.length === 0, executed: true, internalOnly: true, oneItemOnly: true, appendOnly: true, publicPersistenceEnabled: false, productionIngestEnabled: false, publicReadEnabled: false, modelCallsEnabled: false, embeddingsEnabled: false, semanticRetrievalEnabled: false, gptActionsEnabled: false, mcpEnabled: false, blockers: proofBlockers, warnings: ["stop_after_one_item", "do_not_proceed_to_retrieval"], receipt: { workflowId: `first-live-append-${receiptFingerprint}`, namespace, serverUserFingerprint: fingerprint(userId), reviewItemId, decisionId, memoryItemId, sourceId, patchCount: 1, auditEventCount: 1, idempotencyFingerprint, contentFingerprint, executionTimestamp: now, readbackStatus: readbackVerified ? "verified" : "failed", browserVisibilityStatus: browserVisible ? "verified" : "failed", auditVerificationStatus: auditVerified ? "verified" : "failed", receiptFingerprint, redacted: true }, proof: { status: proofBlockers.length === 0 ? "ready_to_close" : "blocked", proofReportFingerprint: fingerprint({ receiptFingerprint, readbackVerified, browserVisible, auditVerified }), appendOnlyVerification: "verified", finalStopCondition: "Stop after one item. Do not batch. Do not proceed to retrieval.", redacted: true }, gates: input.gates, message: proofBlockers.length === 0 ? "First controlled live append proof executed. Stop now before retrieval." : "Append executed, but proof verification has blockers. Stop and investigate before any next step." }, { status: proofBlockers.length === 0 ? 200 : 500 });
}
