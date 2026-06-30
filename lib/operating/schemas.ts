import { z } from "zod";

export const namespaceSchema = z.enum(["real_life", "au"]).default("real_life");

const optionalText = z.string().trim().min(1).optional();

function normalizeTextArray(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;

  if (Array.isArray(value)) {
    const items = value
      .flatMap((item) => (typeof item === "string" ? item.split("\n") : []))
      .flatMap((line) => line.split(","))
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  }

  if (typeof value === "string") {
    const items = value
      .split("\n")
      .flatMap((line) => line.split(","))
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  }

  return value;
}

const textArray = z.preprocess(normalizeTextArray, z.array(z.string().trim().min(1)).optional());

export const createWorkSessionSchema = z.object({
  namespace: namespaceSchema,
  project_key: optionalText,
  declared_goal: z.string().trim().min(3),
  proof_target: optionalText,
  next_action: optionalText,
});

export const endWorkSessionSchema = z.object({
  outcome_summary: optionalText,
  next_action: optionalText,
  proof_hit: z.boolean().optional(),
});

export const updateWorkSessionSchema = z.object({
  project_key: optionalText,
  declared_goal: optionalText,
  proof_target: optionalText,
  status: optionalText,
  outcome_summary: optionalText,
  next_action: optionalText,
});

export const createPriorityLockSchema = z.object({
  namespace: namespaceSchema,
  project_key: z.string().trim().min(1),
  locked_outcome: z.string().trim().min(3),
  proof_target: optionalText,
  allowed_support: textArray,
  blocked_distractions: textArray,
  locked_until: optionalText,
  status: optionalText,
});

export const updatePriorityLockSchema = createPriorityLockSchema.partial().extend({
  namespace: namespaceSchema.optional(),
});

export const createRawMovementItemSchema = z.object({
  namespace: namespaceSchema,
  raw_text: z.string().trim().min(3),
  source: z.string().trim().min(1).default("manual"),
});

export const updateRawMovementItemSchema = z.object({
  status: z.enum(["new", "reviewed", "converted", "parked", "rejected"]).optional(),
  risk_level: optionalText,
});

export const createDecisionGateSchema = z.object({
  namespace: namespaceSchema,
  action_considered: z.string().trim().min(3),
  desired_outcome: optionalText,
  facts: textArray,
  assumptions: textArray,
  risks: textArray,
  authority_check: optionalText,
  proof_required: optionalText,
  recommendation: optionalText,
  next_action: optionalText,
  status: z.enum(["draft", "go", "park", "kill", "rework"]).default("draft"),
});

export const updateDecisionGateSchema = createDecisionGateSchema.partial().extend({
  namespace: namespaceSchema.optional(),
});

export const createObnaSchema = z.object({
  namespace: namespaceSchema,
  session_id: optionalText,
  priority_lock_id: optionalText,
  title: z.string().trim().min(3),
  reason: optionalText,
  proof_target: optionalText,
  timebox_minutes: z.coerce.number().int().positive().max(480).optional(),
  steps: textArray,
  status: optionalText,
});

export const updateObnaSchema = z.object({
  status: z.enum(["active", "completed", "superseded", "parked"]).optional(),
  title: optionalText,
  reason: optionalText,
  proof_target: optionalText,
  steps: textArray,
});

export const priorityGateInputSchema = z.object({
  proposed_action: z.string().trim().min(3),
  namespace: namespaceSchema,
});
