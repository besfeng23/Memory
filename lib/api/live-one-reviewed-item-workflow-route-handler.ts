import { NextResponse, type NextRequest } from "next/server";
import { resolvePandoraServerSession, assertNoClientUserIdOverride } from "@/lib/auth/pandora-server-session-resolver";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import { runLiveOneReviewedItemWorkflow } from "@/lib/services/live-one-reviewed-item-workflow-runner";
import { runFirstLiveAppendDirectProof } from "@/lib/services/first-live-append-direct-proof-executor";
import { toLiveOneReviewedItemWorkflowSafeDto } from "@/lib/api/live-one-reviewed-item-workflow-dto";
import type { PandoraServerSessionResult } from "@/lib/auth/pandora-server-session-contract";

export type LiveOneReviewedItemWorkflowRouteDependencies = {
  enabled?: boolean;
  env?: () => NodeJS.ProcessEnv;
  resolveSession?: (request: NextRequest) => Promise<PandoraServerSessionResult>;
  workflowRunner?: typeof runLiveOneReviewedItemWorkflow;
  reviewRepository?: unknown;
  previewService?: unknown;
  approvedReviewPersistenceExecutor?: unknown;
  persistedMemoryReadRepository?: unknown;
  browserLoader?: unknown;
  auditVerifier?: unknown;
};

type LiveOnePayload = Record<string, unknown>;

const disabled = {
  ok: false,
  executed: false,
  internalOnly: true,
  oneItemOnly: true,
  publicPersistenceEnabled: false,
  productionIngestEnabled: false,
  publicReadEnabled: false,
  message: "Live one-item memory workflow is disabled by default and requires internal operator wiring.",
  blockers: ["live_one_item_workflow_disabled", "internal_admin_gate_required"],
};

const instructions = [
  "Internal operator workflow",
  "One approved review item only",
  "Public persistence is disabled",
  "Production ingest writes are disabled",
  "Execution requires typed confirmation: APPEND MEMORY",
  "No model calls, embeddings, or semantic retrieval",
  "Audit verification is required",
];

function isRecord(value: unknown): value is LiveOnePayload {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function routeBlockersForInjectedWorkflow(input: { body: LiveOnePayload; request: NextRequest; runtime: ReturnType<typeof resolvePandoraRuntimeSafetyConfig>; session: PandoraServerSessionResult }) {
  const blockers: string[] = [];
  const caps = input.session.ok ? input.session.session : null;
  if (!caps?.authenticated) blockers.push("missing_authenticated_server_user");
  if (!caps?.isInternalOperator && !caps?.isPersistenceOperator && !caps?.adminCapabilities.includes("memory:manual-workflow")) blockers.push("operator_capability_required");
  if (!input.body.namespace) blockers.push("missing_namespace");
  if (!input.body.reviewItemId) blockers.push("missing_review_item_id");
  if (!input.body.decisionId) blockers.push("missing_decision_id");
  if (!input.body.idempotencyKey) blockers.push("missing_idempotency_key");
  if (input.body.typedConfirmation !== "APPEND MEMORY") blockers.push("typed_confirmation_mismatch");
  if (input.request.headers.get("x-pandora-internal-persistence-mode") !== "approved-review-executor") blockers.push("missing_internal_header");
  if (!input.runtime.config.approvedReviewPersistenceEnabled) blockers.push("approved_review_persistence_gate_disabled");
  if (!input.runtime.config.adminPersistenceConsoleEnabled) blockers.push("admin_persistence_gate_disabled");
  if (input.runtime.config.publicMemoryPersistenceEnabled || input.runtime.config.ingestProductionWriteEnabled || input.runtime.config.publicMemoryReadEnabled) blockers.push("unsafe_public_or_ingest_gate_enabled");
  return blockers;
}

export function createLiveOneReviewedItemWorkflowRouteHandler(deps: LiveOneReviewedItemWorkflowRouteDependencies = {}) {
  return {
    GET() {
      const runtime = resolvePandoraRuntimeSafetyConfig(deps.env?.() ?? process.env);
      return NextResponse.json({ ...disabled, instructions, gates: runtime.gates }, { status: 200 });
    },
    async POST(request: NextRequest) {
      const rawBody = await request.json().catch(() => ({}));
      const body = isRecord(rawBody) ? rawBody : {};
      const rejected = await assertNoClientUserIdOverride(request, body);
      if (rejected) return NextResponse.json({ ...disabled, blockers: ["client_user_id_rejected"] }, { status: 400 });

      const env = deps.env?.() ?? process.env;
      const runtime = resolvePandoraRuntimeSafetyConfig(env);
      const directProofEnabled = env.PANDORA_ENABLE_ONE_ITEM_PROOF_EXECUTOR === "true";
      const hasInjectedWorkflow = Boolean(deps.enabled && deps.workflowRunner && deps.reviewRepository && deps.previewService && deps.approvedReviewPersistenceExecutor && deps.persistedMemoryReadRepository && deps.browserLoader && deps.auditVerifier);
      if (!deps.enabled && !directProofEnabled) return NextResponse.json({ ...disabled, gates: runtime.gates }, { status: 501 });

      const session = deps.resolveSession ? await deps.resolveSession(request) : await resolvePandoraServerSession({ request });
      if (hasInjectedWorkflow) {
        const blockers = routeBlockersForInjectedWorkflow({ body, request, runtime, session });
        if (blockers.length) return NextResponse.json({ ...disabled, blockers, gates: runtime.gates }, { status: 403 });
        const caps = session.ok ? session.session : null;
        const result = await deps.workflowRunner!({
          context: { userId: caps!.userId, namespace: body.namespace as never },
          sessionResult: session,
          runtime,
          namespace: body.namespace as never,
          allowedNamespaces: caps!.allowedNamespaces as never,
          reviewItemId: body.reviewItemId as never,
          decisionId: body.decisionId as never,
          idempotencyKey: body.idempotencyKey as never,
          typedConfirmation: body.typedConfirmation as never,
          internalHeaderMode: request.headers.get("x-pandora-internal-persistence-mode"),
          operatorCapability: true,
          reviewRepository: deps.reviewRepository as never,
          previewService: deps.previewService as never,
          approvedReviewPersistenceExecutor: deps.approvedReviewPersistenceExecutor as never,
          persistedMemoryReadRepository: deps.persistedMemoryReadRepository as never,
          browserLoader: deps.browserLoader as never,
          auditVerifier: deps.auditVerifier as never,
        });
        return NextResponse.json(toLiveOneReviewedItemWorkflowSafeDto(result), { status: result.ok ? 200 : 403 });
      }

      if (!directProofEnabled) return NextResponse.json({ ...disabled, blockers: ["missing_internal_dependencies"], gates: runtime.gates }, { status: 501 });
      return runFirstLiveAppendDirectProof({ request, payload: body, env, gates: runtime.gates, sessionResult: session });
    },
  };
}
