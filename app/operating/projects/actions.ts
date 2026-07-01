"use server";

import { revalidatePath } from "next/cache";
import { createOperatingProject } from "@/lib/operating/projects";
import { createOperatingProjectSchema } from "@/lib/operating/project-schemas";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
  revalidatePath("/operating/projects");
}
