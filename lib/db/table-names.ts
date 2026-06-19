import type { PublicTableName } from "@/lib/supabase/database.types";

export const CORE_TABLE_NAMES = [
  "memory_items",
  "memory_sources",
  "memory_patches",
  "retrieval_logs",
  "prompt_logs",
  "audit_logs",
] as const satisfies readonly PublicTableName[];

export const REAL_LIFE_TABLE_NAMES = [
  "people",
  "relationships",
  "relationship_events",
  "business_entities",
  "business_deals",
  "promises",
  "decisions",
  "risks",
  "evidence_items",
] as const satisfies readonly PublicTableName[];

export const AU_TABLE_NAMES = [
  "au_worlds",
  "au_characters",
  "au_relationships",
  "au_scenes",
  "au_consequences",
  "au_open_threads",
  "au_rules",
  "au_character_states",
  "au_relationship_states",
  "au_retcons",
  "au_quality_reviews",
] as const satisfies readonly PublicTableName[];

export const ALL_PANDORA_TABLE_NAMES = [
  ...CORE_TABLE_NAMES,
  ...REAL_LIFE_TABLE_NAMES,
  ...AU_TABLE_NAMES,
] as const satisfies readonly PublicTableName[];

export type CoreTableName = (typeof CORE_TABLE_NAMES)[number];
export type RealLifeTableName = (typeof REAL_LIFE_TABLE_NAMES)[number];
export type AuTableName = (typeof AU_TABLE_NAMES)[number];

export function isPandoraTableName(value: string): value is PublicTableName {
  return (ALL_PANDORA_TABLE_NAMES as readonly string[]).includes(value);
}

export function isRealLifeTableName(value: PublicTableName): value is RealLifeTableName {
  return (REAL_LIFE_TABLE_NAMES as readonly string[]).includes(value);
}

export function isAuTableName(value: PublicTableName): value is AuTableName {
  return (AU_TABLE_NAMES as readonly string[]).includes(value);
}
