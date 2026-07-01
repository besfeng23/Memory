import { z } from "zod";
import { namespaceSchema } from "@/lib/operating/schemas";

const optionalText = z.string().trim().min(1).optional();

export const createOperatingProjectSchema = z.object({
  namespace: namespaceSchema,
  project_key: z.string().trim().min(1),
  title: z.string().trim().min(3),
  purpose: optionalText,
  proof_target: optionalText,
  current_phase: optionalText,
  priority: z.coerce.number().int().min(0).max(100).default(50),
  status: z.enum(["active", "paused", "completed", "archived"]).default("active"),
});

export const updateOperatingProjectSchema = createOperatingProjectSchema.partial().extend({
  namespace: namespaceSchema.optional(),
});

export const createProjectTaskSchema = z.object({
  title: z.string().trim().min(3),
  description: optionalText,
  status: z.enum(["open", "doing", "blocked", "done", "parked"]).default("open"),
  proof_required: optionalText,
  due_at: optionalText,
});

export const updateProjectTaskSchema = createProjectTaskSchema.partial();

export const createProjectDecisionSchema = z.object({
  decision: z.string().trim().min(3),
  reason: optionalText,
  status: z.enum(["active", "superseded", "reversed"]).default("active"),
  source_decision_gate_id: optionalText,
});

export const createProjectConstraintSchema = z.object({
  constraint_text: z.string().trim().min(3),
  severity: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  status: z.enum(["active", "resolved", "archived"]).default("active"),
});

export const createProjectArtifactSchema = z.object({
  title: z.string().trim().min(3),
  artifact_type: z.string().trim().min(1).default("note"),
  uri: optionalText,
  description: optionalText,
  proof_value: optionalText,
});

export const createProjectOpenLoopSchema = z.object({
  loop_text: z.string().trim().min(3),
  status: z.enum(["open", "waiting", "resolved", "parked"]).default("open"),
  next_action: optionalText,
});
