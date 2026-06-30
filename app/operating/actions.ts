"use server";

import { revalidatePath } from "next/cache";
import { createWorkSession, generateOneBestNextAction } from "@/lib/operating/service";
import { createWorkSessionSchema } from "@/lib/operating/schemas";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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

export async function generateObnaAction() {
  await generateOneBestNextAction("real_life");
  revalidatePath("/operating");
}
