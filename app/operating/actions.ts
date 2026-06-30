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
} from "@/lib/operating/service";
import {
  createDecisionGateSchema,
  createPriorityLockSchema,
  createRawMovementItemSchema,
  createWorkSessionSchema,
  endWorkSessionSchema,
} from "@/lib/operating/schemas";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function lines(formData: FormData, key: string) {
  return formValue(formData, key);
}

export async function startWorkSessionAction(formData: FormData) {
  const input = createWorkSessionSchema.parse({
    project_key: formValue(formData, "project_key"),
    declared_goal: formValue(formData, "declared_goal"),
    proof_target: formValue(formData, "proof_target"),
    next_action: formValue(formData, "next_action"),
    namespace: "real_life",
  });

  await createWorkSession(input);
  revalidatePath("/operating");
}

export async function endWorkSessionAction(formData: FormData) {
  const id = formValue(formData, "id");
  if (!id) throw new Error("Missing work session id.");

  const input = endWorkSessionSchema.parse({
    outcome_summary: formValue(formData, "outcome_summary"),
    next_action: formValue(formData, "next_action"),
  });

  await endWorkSession(id, input);
  revalidatePath("/operating");
}

export async function createPriorityLockAction(formData: FormData) {
  const input = createPriorityLockSchema.parse({
    project_key: formValue(formData, "project_key"),
    locked_outcome: formValue(formData, "locked_outcome"),
    proof_target: formValue(formData, "proof_target"),
    allowed_support: lines(formData, "allowed_support"),
    blocked_distractions: lines(formData, "blocked_distractions"),
    locked_until: formValue(formData, "locked_until"),
    namespace: "real_life",
  });

  await createPriorityLock(input);
  revalidatePath("/operating");
}

export async function createRawMovementItemAction(formData: FormData) {
  const input = createRawMovementItemSchema.parse({
    raw_text: formValue(formData, "raw_text"),
    source: formValue(formData, "source") ?? "manual",
    namespace: "real_life",
  });

  await createRawMovementItem(input);
  revalidatePath("/operating");
}

export async function createDecisionGateAction(formData: FormData) {
  const input = createDecisionGateSchema.parse({
    action_considered: formValue(formData, "action_considered"),
    desired_outcome: formValue(formData, "desired_outcome"),
    facts: lines(formData, "facts"),
    assumptions: lines(formData, "assumptions"),
    risks: lines(formData, "risks"),
    authority_check: formValue(formData, "authority_check"),
    proof_required: formValue(formData, "proof_required"),
    recommendation: formValue(formData, "recommendation"),
    next_action: formValue(formData, "next_action"),
    status: formValue(formData, "status") ?? "draft",
    namespace: "real_life",
  });

  await createDecisionGate(input);
  revalidatePath("/operating");
}

export async function generateObnaAction() {
  await generateOneBestNextAction("real_life");
  revalidatePath("/operating");
}

export async function completeObnaAction(formData: FormData) {
  const id = formValue(formData, "id");
  if (!id) throw new Error("Missing OBNA id.");

  await completeOneBestNextAction(id);
  revalidatePath("/operating");
}
