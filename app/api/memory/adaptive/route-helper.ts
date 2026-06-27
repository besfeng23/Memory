import { NextRequest, NextResponse } from "next/server";
import { resolvePandoraRuntimeSafetyConfig, type PandoraRuntimeGate } from "@/lib/config/pandora-runtime-safety-config";
import { resolveMemoryBridgePrincipal } from "@/lib/services/memory-bridge-auth";
import { createMemoryBridgeDbClientForPrincipal } from "@/lib/services/memory-bridge-db";

export type AdaptiveMemoryGate = Extract<PandoraRuntimeGate, "memoryCaptureApiEnabled" | "memoryContextApiEnabled" | "memoryDistillationEnabled">;

export function namespace(value?: string) {
  return value === "au" || value === "real_life" ? value : null;
}

function gateList(gates?: AdaptiveMemoryGate | AdaptiveMemoryGate[]) {
  if (!gates) return [];
  return Array.isArray(gates) ? gates : [gates];
}

export async function withBridge(request: NextRequest, requiredGates?: AdaptiveMemoryGate | AdaptiveMemoryGate[]) {
  const runtime = resolvePandoraRuntimeSafetyConfig();
  for (const gate of gateList(requiredGates)) {
    if (!runtime.config[gate]) {
      return {
        error: NextResponse.json(
          {
            ok: false,
            blockers: [`${gate}_disabled`],
            next_step: `Set ${runtime.gates[gate].envVar}=true in a reviewed environment.`,
          },
          { status: 403 },
        ),
      };
    }
  }

  const principal = await resolveMemoryBridgePrincipal(request);
  if (!principal.ok) return { error: NextResponse.json({ ok: false, blockers: principal.blockers }, { status: 401 }) };
  const client = await createMemoryBridgeDbClientForPrincipal(principal);
  return { principal, client, runtime };
}
