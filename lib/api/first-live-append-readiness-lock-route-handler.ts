import { NextResponse, type NextRequest } from "next/server";
import type { PandoraServerSessionResult } from "@/lib/auth/pandora-server-session-contract";
import { assertNoClientUserIdOverride } from "@/lib/auth/pandora-server-session-resolver";
import { resolvePandoraRuntimeSafetyConfig } from "@/lib/config/pandora-runtime-safety-config";
import {
  evaluateFirstLiveAppendEmergencyStop,
  type FirstLiveAppendEmergencyStopInput,
} from "@/lib/services/first-live-append-emergency-stop";
import { evaluateFirstLiveAppendReadinessLock } from "@/lib/services/first-live-append-readiness-lock-evaluator";
import { toFirstLiveAppendReadinessLockDto } from "@/lib/api/first-live-append-readiness-lock-dto";

export type FirstLiveAppendReadinessRouteDeps = FirstLiveAppendEmergencyStopInput & {
  enabled?: boolean;
  env?: () => NodeJS.ProcessEnv;
  resolveSession?: (request: NextRequest) => Promise<PandoraServerSessionResult>;
};

function resolveEmergencyStopInput(deps: FirstLiveAppendReadinessRouteDeps, env: NodeJS.ProcessEnv) {
  return {
    ...deps,
    runtimeEmergencyStopEnabled:
      deps.runtimeEmergencyStopEnabled ?? env.PANDORA_FIRST_LIVE_APPEND_EMERGENCY_STOP === "true",
  };
}

export function createFirstLiveAppendReadinessLockRouteHandler(
  deps: FirstLiveAppendReadinessRouteDeps = {},
) {
  return {
    async GET() {
      const env = deps.env?.() ?? process.env;
      const runtime = resolvePandoraRuntimeSafetyConfig(env);
      const emergencyStop = await evaluateFirstLiveAppendEmergencyStop(resolveEmergencyStopInput(deps, env));
      const result = evaluateFirstLiveAppendReadinessLock({
        runtime,
        emergencyStop,
        manualWorkflowAvailable: true,
        liveOneItemWorkflowAvailable: true,
        proofPackAvailable: true,
        controlledRunbookAvailable: true,
      });

      return NextResponse.json(toFirstLiveAppendReadinessLockDto(result), { status: 200 });
    },

    async POST(request: NextRequest) {
      const body = await request.json().catch(() => ({}));
      const rejected = await assertNoClientUserIdOverride(request, body);
      if (rejected) {
        return NextResponse.json({ ok: false, blockers: ["client_user_id_rejected"] }, { status: 400 });
      }

      const env = deps.env?.() ?? process.env;
      const runtime = resolvePandoraRuntimeSafetyConfig(env);
      const emergencyStop = await evaluateFirstLiveAppendEmergencyStop(resolveEmergencyStopInput(deps, env));

      if (!deps.enabled) {
        const result = evaluateFirstLiveAppendReadinessLock({ runtime, emergencyStop });
        return NextResponse.json(
          { ...toFirstLiveAppendReadinessLockDto(result, { idempotencyKey: body.idempotencyKey }), disabled: true },
          { status: 501 },
        );
      }

      const sessionResult = await deps.resolveSession?.(request);
      const result = evaluateFirstLiveAppendReadinessLock({
        sessionResult,
        runtime,
        emergencyStop,
        namespace: body.namespace,
        reviewItemId: body.reviewItemId,
        reviewItemIds: body.reviewItemIds,
        reviewItemStatus: body.reviewItemStatus,
        reviewItemApprovedForAppend: body.reviewItemApprovedForAppend,
        decisionId: body.decisionId,
        decisionIds: body.decisionIds,
        decisionReviewItemId: body.decisionReviewItemId,
        appendDecisionSelected: Boolean(body.decisionId),
        preview: body.preview,
        idempotencyKey: body.idempotencyKey,
        typedConfirmation: body.typedConfirmation,
        allowedNamespaces: sessionResult?.ok ? sessionResult.session.allowedNamespaces as string[] | undefined : undefined,
        manualWorkflowAvailable: true,
        liveOneItemWorkflowAvailable: true,
        proofPackAvailable: true,
        controlledRunbookAvailable: true,
        proofCaptureAvailable: body.proofCaptureAvailable === true,
        readbackVerificationAvailable: body.readbackVerificationAvailable === true,
        browserVisibilityVerificationAvailable: body.browserVisibilityVerificationAvailable === true,
        auditVerificationAvailable: body.auditVerificationAvailable === true,
      });
      const missingHeader = request.headers.get("x-pandora-internal-readiness-mode") === "first-live-append"
        ? []
        : ["missing_internal_readiness_header"];
      const dto = toFirstLiveAppendReadinessLockDto(result, {
        idempotencyKey: body.idempotencyKey,
        serverUserId: sessionResult?.ok ? sessionResult.session.userId : undefined,
      });

      return NextResponse.json(
        missingHeader.length
          ? { ...dto, readinessStatus: "blocked", blockers: [...dto.blockers, ...missingHeader] }
          : dto,
        { status: result.ready && !missingHeader.length ? 200 : 403 },
      );
    },
  };
}
