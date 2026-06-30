"use server";

import { revalidatePath } from "next/cache";
import {
  completeOneBestNextAction,
  createDecisionGate,
  createPriorityLock,
  createRawMovementItem,
  createWorkSession,
  endWorkSession,
  generateOneBestNextAction,
  getActiveOneBestNextAction,
  getActiveWorkSession,
} from "@/lib/operating/service";

function smokeRunId() {
  return `phase-6a2-${new Date().toISOString()}`;
}

export async function seedOperatingSmokeAction() {
  const runId = smokeRunId();

  await createPriorityLock({
    namespace: "real_life",
    project_key: "phase-6a-operating-smoke",
    locked_outcome: `Complete signed-in Phase 6A.2 smoke workflow (${runId})`,
    proof_target: "Priority lock, work session, OBNA, raw movement, decision gate, and completion lifecycle all persist for the authenticated user.",
    allowed_support: ["smoke test", "manual QA", "proof report"],
    blocked_distractions: ["connectors", "prediction engine", "Phase 6B"],
  });

  await createWorkSession({
    namespace: "real_life",
    project_key: "phase-6a-operating-smoke",
    declared_goal: `Run signed-in operating smoke workflow (${runId})`,
    proof_target: "Generate and complete an OBNA, capture raw movement, create a decision gate, and end the work session.",
    next_action: "Generate OBNA and verify the smoke records appear on /operating.",
  });

  await createRawMovementItem({
    namespace: "real_life",
    raw_text: `Smoke raw movement item for ${runId}: verify proof, risk, task, and decision capture flow works from the signed-in cockpit.`,
    source: "phase-6a2-smoke",
  });

  await createDecisionGate({
    namespace: "real_life",
    action_considered: `Should Phase 6A.2 be considered smoke-verified? (${runId})`,
    desired_outcome: "Confirm the operating cockpit can create and persist the core Phase 6A records for the authenticated user.",
    facts: ["Phase 6A migration is applied", "Operating tables exist", "The user is signed in"],
    assumptions: ["Manual browser session can submit server actions"],
    risks: ["A form may render but fail after submission if auth handling breaks"],
    authority_check: "Authenticated user only.",
    proof_required: "All smoke records appear after reload and the active session can be ended.",
    recommendation: "go",
    next_action: "Complete the active OBNA and end the work session.",
    status: "go",
  });

  await generateOneBestNextAction("real_life");

  revalidatePath("/operating");
  revalidatePath("/operating/smoke");
}

export async function completeOperatingSmokeAction() {
  const obna = await getActiveOneBestNextAction("real_life");
  if (obna) {
    await completeOneBestNextAction(obna.id);
  }

  const session = await getActiveWorkSession("real_life");
  if (session) {
    await endWorkSession(session.id, {
      outcome_summary: "Phase 6A.2 smoke workflow completed through the signed-in operating cockpit.",
      next_action: "Review persisted records and then move to Phase 6B only after manual QA is accepted.",
    });
  }

  revalidatePath("/operating");
  revalidatePath("/operating/smoke");
}
