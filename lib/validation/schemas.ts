import { z } from "zod";

export const memoryNamespaceSchema = z.enum(["real_life", "au"]);
export type MemoryNamespace = z.infer<typeof memoryNamespaceSchema>;

export const memoryStrengthSchema = z.enum(["low", "medium", "high", "locked"]);
export type MemoryStrength = z.infer<typeof memoryStrengthSchema>;

export const canonStatusSchema = z.enum([
  "draft",
  "soft_canon",
  "hard_canon",
  "retconned",
  "disputed",
]);
export type CanonStatus = z.infer<typeof canonStatusSchema>;

export const memoryTypeSchema = z.enum([
  "observation",
  "user_preference",
  "soft_canon",
  "hard_canon",
  "contradiction",
  "retcon_candidate",
  "real_life_fact",
  "business_fact",
  "relationship_signal",
  "risk_signal",
]);
export type MemoryType = z.infer<typeof memoryTypeSchema>;

export const memoryClassificationSchema = z.object({
  namespace: memoryNamespaceSchema,
  strength: memoryStrengthSchema,
  canonStatus: canonStatusSchema,
  type: memoryTypeSchema,
});
export type MemoryClassification = z.infer<typeof memoryClassificationSchema>;
