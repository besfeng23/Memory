import { getOperatingSnapshot } from "@/lib/operating/service";
import { withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export function GET() {
  return withOperatingApi(async () => {
    const snapshot = await getOperatingSnapshot("real_life");

    return {
      ok: true,
      has_priority_lock: snapshot.activePriorityLock?.project_key === "phase-6a-operating-smoke",
      has_work_session: snapshot.activeWorkSession?.project_key === "phase-6a-operating-smoke",
      has_obna: Boolean(snapshot.activeObna),
      has_raw_movement: snapshot.rawMovementItems.some((item) => item.source === "phase-6a2-smoke"),
      has_decision_gate: snapshot.decisionGates.some((gate) => gate.action_considered.includes("Phase 6A.2")),
      active_project: snapshot.activeWorkSession?.project_key ?? snapshot.activePriorityLock?.project_key ?? null,
    };
  });
}
