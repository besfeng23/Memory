import { z } from "zod";
import { canonStatusSchema, memoryNamespaceSchema, memoryStrengthSchema, memoryTypeSchema } from "@/lib/validation/schemas";

export const evidenceSourceTypeSchema = z.enum([
  "screenshot",
  "email",
  "document",
  "user_statement",
  "conversation_turn",
  "url",
  "uploaded_file",
  "manual_admin_entry",
  "other",
]);

export const jsonRecordSchema = z.record(z.string(), z.unknown());

export const memorySourceCandidateSchema = z.object({
  source_type: evidenceSourceTypeSchema,
  source_ref: z.string().trim().min(1).max(500).nullable().optional(),
  excerpt: z.string().trim().min(1).max(5000).nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  metadata: jsonRecordSchema.default({}),
});

export const memoryCandidateSchema = z.object({
  namespace: memoryNamespaceSchema,
  memory_type: memoryTypeSchema,
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().min(3).max(12000),
  strength: memoryStrengthSchema.default("medium"),
  confidence: z.number().min(0).max(1).default(0.5),
  canon_status: canonStatusSchema.default("draft"),
  source_summary: z.string().trim().min(1).max(1000).nullable().optional(),
  metadata: jsonRecordSchema.default({}),
  sources: z.array(memorySourceCandidateSchema).max(20).default([]),
});

export const memoryPatchCandidateSchema = z.object({
  namespace: memoryNamespaceSchema,
  memory_item_id: z.string().trim().min(1),
  patch_type: z.string().trim().min(2).max(120),
  reason: z.string().trim().min(8).max(2000).nullable().optional(),
  before_snapshot: jsonRecordSchema.nullable().optional(),
  after_snapshot: jsonRecordSchema,
  metadata: jsonRecordSchema.default({}),
});

export type MemorySourceCandidate = z.infer<typeof memorySourceCandidateSchema>;
export type MemoryCandidate = z.infer<typeof memoryCandidateSchema>;
export type MemoryPatchCandidate = z.infer<typeof memoryPatchCandidateSchema>;

export const REAL_LIFE_MEMORY_TYPES = [
  "observation",
  "user_preference",
  "contradiction",
  "real_life_fact",
  "business_fact",
  "relationship_signal",
  "risk_signal",
] as const;

export const AU_MEMORY_TYPES = [
  "observation",
  "user_preference",
  "soft_canon",
  "hard_canon",
  "contradiction",
  "retcon_candidate",
] as const;
