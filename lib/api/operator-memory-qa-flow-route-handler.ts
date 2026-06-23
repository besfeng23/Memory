import { NextResponse, type NextRequest } from "next/server";
import type { RepositoryContext } from "@/lib/db/repository-context";
import { runOperatorMemoryQaFlow } from "@/lib/services/operator-memory-qa-flow-runner";
import { toOperatorMemoryQaFlowSafeDto } from "@/lib/api/operator-memory-qa-flow-dto";
export type OperatorMemoryQaFlowRouteDependencies = { resolveAuth?: (request: NextRequest) => Promise<Pick<RepositoryContext, "userId"> | null>; env?: () => NodeJS.ProcessEnv; qaRunner?: typeof runOperatorMemoryQaFlow; enabled?: boolean; reviewRepository?: unknown; previewService?: unknown; persistenceExecutor?: unknown; persistedMemoryReadRepository?: unknown; browserLoader?: unknown };
const disabled = { ok: false, executed: false, internalOnly: true, message: "Internal operator QA flow is disabled by default.", blockers: ["operator_qa_flow_disabled", "internal_test_mode_required"], publicPersistenceEnabled: false, publicMemoryReadEnabled: false };
export function createOperatorMemoryQaFlowRouteHandler(deps: OperatorMemoryQaFlowRouteDependencies = {}) { return async function POST(request: NextRequest) {
  if (!deps.enabled) return NextResponse.json(disabled, { status: 501 });
  const body = await request.json().catch(() => ({}));
  if (body.user_id || body.userId) return NextResponse.json({ ...disabled, blockers: ["client_user_id_rejected"] }, { status: 400 });
  const env = deps.env?.() ?? process.env;
  const blockers = [env.PANDORA_ENABLE_APPROVED_REVIEW_MEMORY_PERSISTENCE === "true" ? null : "persistence_env_flag_disabled", env.PANDORA_ENABLE_ADMIN_PERSISTENCE_CONSOLE === "true" ? null : "admin_console_env_flag_disabled", env.PANDORA_ENABLE_OPERATOR_MEMORY_QA_FLOW === "true" ? null : "operator_qa_env_flag_disabled", request.headers.get("x-pandora-internal-persistence-mode") === "approved-review-executor" ? null : "missing_internal_header"].filter(Boolean) as string[];
  const auth = await deps.resolveAuth?.(request); if (!auth?.userId) blockers.push("missing_authenticated_server_user");
  if (!body.namespace) blockers.push("missing_namespace"); if (!body.reviewItemId) blockers.push("missing_review_item_id"); if (!body.decisionId) blockers.push("missing_decision_id"); if (!body.idempotencyKey) blockers.push("missing_idempotency_key");
  if (blockers.length) return NextResponse.json({ ...disabled, blockers }, { status: 403 });
  if (!deps.qaRunner || !deps.reviewRepository || !deps.previewService || !deps.persistenceExecutor || !deps.persistedMemoryReadRepository || !deps.browserLoader) return NextResponse.json(disabled, { status: 501 });
  const result = await deps.qaRunner({ context: { userId: auth!.userId, namespace: body.namespace }, namespace: body.namespace, reviewItemId: body.reviewItemId, decisionId: body.decisionId, idempotencyKey: body.idempotencyKey, reviewRepository: deps.reviewRepository as never, previewService: deps.previewService as never, persistenceExecutor: deps.persistenceExecutor as never, persistedMemoryReadRepository: deps.persistedMemoryReadRepository as never, browserLoader: deps.browserLoader as never });
  return NextResponse.json(toOperatorMemoryQaFlowSafeDto(result), { status: result.ok ? 200 : 403 });
}; }
