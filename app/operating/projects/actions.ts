"use server";

import { revalidatePath } from "next/cache";
import {
  createOperatingProject,
  createProjectArtifact,
  createProjectConstraint,
  createProjectDecision,
  createProjectOpenLoop,
  createProjectTask,
  updateProjectTask,
} from "@/lib/operating/projects";
import {
  createOperatingProjectSchema,
  createProjectArtifactSchema,
  createProjectConstraintSchema,
  createProjectDecisionSchema,
  createProjectOpenLoopSchema,
  createProjectTaskSchema,
  updateProjectTaskSchema,
} from "@/lib/operating/project-schemas";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function projectKey(formData: FormData) {
  const key = formValue(formData, "project_key");
  if (!key) throw new Error("Missing project key.");
  return key;
}

function revalidateProjectPages() {
  revalidatePath("/operating");
  revalidatePath("/operating/projects");
}

export async function createOperatingProjectAction(formData: FormData) {
  const input = createOperatingProjectSchema.parse({
    project_key: formValue(formData, "project_key"),
    title: formValue(formData, "title"),
    purpose: formValue(formData, "purpose"),
    proof_target: formValue(formData, "proof_target"),
    current_phase: formValue(formData, "current_phase"),
    priority: formValue(formData, "priority") ?? "50",
    namespace: "real_life",
  });

  await createOperatingProject(input);
  revalidateProjectPages();
}

export async function createProjectTaskAction(formData: FormData) {
  const key = projectKey(formData);
  const input = createProjectTaskSchema.parse({
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    proof_required: formValue(formData, "proof_required"),
    status: formValue(formData, "status") ?? "open",
    due_at: formValue(formData, "due_at"),
  });

  await createProjectTask(key, input);
  revalidateProjectPages();
}

export async function completeProjectTaskAction(formData: FormData) {
  const taskId = formValue(formData, "task_id");
  if (!taskId) throw new Error("Missing task id.");

  const input = updateProjectTaskSchema.parse({ status: "done" });
  await updateProjectTask(taskId, input);
  revalidateProjectPages();
}

export async function createProjectDecisionAction(formData: FormData) {
  const key = projectKey(formData);
  const input = createProjectDecisionSchema.parse({
    decision: formValue(formData, "decision"),
    reason: formValue(formData, "reason"),
    status: formValue(formData, "status") ?? "active",
  });

  await createProjectDecision(key, input);
  revalidateProjectPages();
}

export async function createProjectConstraintAction(formData: FormData) {
  const key = projectKey(formData);
  const input = createProjectConstraintSchema.parse({
    constraint_text: formValue(formData, "constraint_text"),
    severity: formValue(formData, "severity") ?? "normal",
    status: formValue(formData, "status") ?? "active",
  });

  await createProjectConstraint(key, input);
  revalidateProjectPages();
}

export async function createProjectArtifactAction(formData: FormData) {
  const key = projectKey(formData);
  const input = createProjectArtifactSchema.parse({
    title: formValue(formData, "title"),
    artifact_type: formValue(formData, "artifact_type") ?? "note",
    uri: formValue(formData, "uri"),
    description: formValue(formData, "description"),
    proof_value: formValue(formData, "proof_value"),
  });

  await createProjectArtifact(key, input);
  revalidateProjectPages();
}

export async function createProjectOpenLoopAction(formData: FormData) {
  const key = projectKey(formData);
  const input = createProjectOpenLoopSchema.parse({
    loop_text: formValue(formData, "loop_text"),
    next_action: formValue(formData, "next_action"),
    status: formValue(formData, "status") ?? "open",
  });

  await createProjectOpenLoop(key, input);
  revalidateProjectPages();
}
