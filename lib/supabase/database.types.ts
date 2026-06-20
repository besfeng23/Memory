export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PandoraNamespace = "real_life" | "au";
export type MemoryType =
  | "observation"
  | "user_preference"
  | "soft_canon"
  | "hard_canon"
  | "contradiction"
  | "retcon_candidate"
  | "real_life_fact"
  | "business_fact"
  | "relationship_signal"
  | "risk_signal";
export type MemoryStrength = "low" | "medium" | "high" | "locked";
export type CanonStatus = "draft" | "soft_canon" | "hard_canon" | "retconned" | "disputed";
export type EvidenceSourceType =
  | "screenshot"
  | "email"
  | "document"
  | "user_statement"
  | "conversation_turn"
  | "url"
  | "uploaded_file"
  | "manual_admin_entry"
  | "other";
export type RiskSeverity = "low" | "medium" | "high" | "critical";

export type DbId = string;
export type DbTimestamp = string;
export type Nullable<T> = T | null;

export type BaseOwnedRow = {
  id: DbId;
  user_id: DbId;
  namespace: PandoraNamespace;
  metadata: Json;
  created_at: DbTimestamp;
};

export type MutableOwnedRow = BaseOwnedRow & {
  is_active: boolean;
  updated_at: DbTimestamp;
};

export type MemoryItemRow = MutableOwnedRow & {
  memory_type: MemoryType;
  title: string;
  body: string;
  strength: MemoryStrength;
  confidence: number;
  canon_status: CanonStatus;
  source_summary: Nullable<string>;
};

export type MemorySourceRow = BaseOwnedRow & {
  memory_item_id: Nullable<DbId>;
  source_type: EvidenceSourceType;
  source_ref: Nullable<string>;
  excerpt: Nullable<string>;
  confidence: number;
};

export type MemoryPatchRow = BaseOwnedRow & {
  memory_item_id: DbId;
  patch_type: string;
  reason: Nullable<string>;
  before_snapshot: Nullable<Json>;
  after_snapshot: Json;
};

export type RetrievalLogRow = BaseOwnedRow & {
  query_text: string;
  filters: Json;
  requested_limit: Nullable<number>;
  returned_item_ids: DbId[];
};

export type PromptLogRow = BaseOwnedRow & {
  route_name: Nullable<string>;
  model_name: Nullable<string>;
  request_hash: Nullable<string>;
  response_hash: Nullable<string>;
};

export type AuditLogRow = BaseOwnedRow & {
  namespace: Nullable<PandoraNamespace>;
  action: string;
  table_name: string;
  record_id: Nullable<DbId>;
  before_snapshot: Nullable<Json>;
  after_snapshot: Json;
};

export type IdempotencyRecordRow = BaseOwnedRow & {
  scope: string;
  operation: string;
  idempotency_key: string;
  key_source: "client" | "request" | "payload";
  fingerprint: string;
  request_hash: Nullable<string>;
  response_hash: Nullable<string>;
  status: "started" | "completed" | "failed";
  expires_at: Nullable<DbTimestamp>;
  updated_at: DbTimestamp;
};

export type MemoryIngestResponseCacheRow = BaseOwnedRow & {
  idempotency_key: string;
  request_hash: string;
  response_status: number;
  response_body: Json;
  warnings: Json;
  expires_at: DbTimestamp;
  last_replayed_at: Nullable<DbTimestamp>;
  replay_count: number;
};

export type PersonRow = MutableOwnedRow & {
  namespace: "real_life";
  display_name: string;
  aliases: string[];
  notes: Nullable<string>;
};

export type RelationshipRow = MutableOwnedRow & {
  namespace: "real_life";
  person_a_id: Nullable<DbId>;
  person_b_id: Nullable<DbId>;
  relationship_type: string;
  summary: Nullable<string>;
};

export type RelationshipEventRow = BaseOwnedRow & {
  namespace: "real_life";
  relationship_id: Nullable<DbId>;
  occurred_at: Nullable<DbTimestamp>;
  event_type: string;
  summary: string;
  source_id: Nullable<DbId>;
};

export type BusinessEntityRow = MutableOwnedRow & {
  namespace: "real_life";
  name: string;
  entity_type: Nullable<string>;
  summary: Nullable<string>;
};

export type BusinessDealRow = MutableOwnedRow & {
  namespace: "real_life";
  business_entity_id: Nullable<DbId>;
  title: string;
  stage: Nullable<string>;
  value_estimate: Nullable<number>;
  currency: Nullable<string>;
  summary: Nullable<string>;
};

export type PromiseRow = BaseOwnedRow & {
  namespace: "real_life";
  person_id: Nullable<DbId>;
  business_deal_id: Nullable<DbId>;
  promise_text: string;
  due_at: Nullable<DbTimestamp>;
  status: string;
  source_id: Nullable<DbId>;
  updated_at: DbTimestamp;
};

export type DecisionRow = BaseOwnedRow & {
  namespace: "real_life";
  title: string;
  decision_text: string;
  decided_at: DbTimestamp;
  source_id: Nullable<DbId>;
};

export type RiskRow = BaseOwnedRow & {
  namespace: "real_life";
  title: string;
  severity: RiskSeverity;
  summary: string;
  status: string;
  source_id: Nullable<DbId>;
  updated_at: DbTimestamp;
};

export type EvidenceItemRow = BaseOwnedRow & {
  namespace: "real_life";
  source_type: EvidenceSourceType;
  title: string;
  source_ref: Nullable<string>;
  summary: Nullable<string>;
  confidence: number;
};

export type AuWorldRow = MutableOwnedRow & {
  namespace: "au";
  name: string;
  premise: Nullable<string>;
  canon_status: CanonStatus;
};

export type AuCharacterRow = MutableOwnedRow & {
  namespace: "au";
  world_id: DbId;
  name: string;
  role: Nullable<string>;
  profile: Nullable<string>;
  canon_status: CanonStatus;
};

export type AuRelationshipRow = MutableOwnedRow & {
  namespace: "au";
  world_id: DbId;
  character_a_id: Nullable<DbId>;
  character_b_id: Nullable<DbId>;
  relationship_type: string;
  summary: Nullable<string>;
  canon_status: CanonStatus;
};

export type AuSceneRow = BaseOwnedRow & {
  namespace: "au";
  world_id: DbId;
  sequence_number: Nullable<number>;
  title: string;
  summary: string;
  scene_text: Nullable<string>;
  occurred_at: Nullable<DbTimestamp>;
  canon_status: CanonStatus;
  updated_at: DbTimestamp;
};

export type AuConsequenceRow = BaseOwnedRow & {
  namespace: "au";
  world_id: DbId;
  scene_id: Nullable<DbId>;
  summary: string;
  status: string;
  updated_at: DbTimestamp;
};

export type AuOpenThreadRow = BaseOwnedRow & {
  namespace: "au";
  world_id: DbId;
  title: string;
  summary: string;
  status: string;
  updated_at: DbTimestamp;
};

export type AuRuleRow = BaseOwnedRow & {
  namespace: "au";
  world_id: DbId;
  rule_text: string;
  canon_status: CanonStatus;
  updated_at: DbTimestamp;
};

export type AuCharacterStateRow = BaseOwnedRow & {
  namespace: "au";
  character_id: DbId;
  current_state: Json;
  derived_from_scene_id: Nullable<DbId>;
  updated_at: DbTimestamp;
};

export type AuRelationshipStateRow = BaseOwnedRow & {
  namespace: "au";
  relationship_id: DbId;
  current_state: Json;
  derived_from_scene_id: Nullable<DbId>;
  updated_at: DbTimestamp;
};

export type AuRetconRow = BaseOwnedRow & {
  namespace: "au";
  world_id: DbId;
  target_table: string;
  target_id: Nullable<DbId>;
  reason: string;
  before_snapshot: Nullable<Json>;
  after_snapshot: Json;
  status: string;
  updated_at: DbTimestamp;
};

export type AuQualityReviewRow = BaseOwnedRow & {
  namespace: "au";
  scene_id: Nullable<DbId>;
  continuity_score: Nullable<number>;
  character_consistency_score: Nullable<number>;
  consequence_progression_score: Nullable<number>;
  notes: Nullable<string>;
};

type Insert<T extends { id: DbId; created_at: DbTimestamp }> = Omit<T, "id" | "created_at"> & {
  id?: DbId;
  created_at?: DbTimestamp;
};

type Update<T> = Partial<T>;

type Table<Row> = {
  Row: Row;
  Insert: Row extends { id: DbId; created_at: DbTimestamp } ? Insert<Row> : Partial<Row>;
  Update: Update<Row>;
  Relationships: never[];
};

export type ClaimIdempotencyRecordArgs = {
  p_namespace: PandoraNamespace;
  p_scope: string;
  p_operation: string;
  p_idempotency_key: string;
  p_key_source: "client" | "request" | "payload";
  p_fingerprint: string;
  p_request_hash?: Nullable<string>;
  p_expires_at?: Nullable<DbTimestamp>;
  p_metadata?: Json;
};

export type ClaimIdempotencyRecordRow = {
  record_id: DbId;
  was_claimed: boolean;
  existing_status: Nullable<string>;
};

export type FinishIdempotencyRecordArgs = {
  p_record_id: DbId;
  p_namespace: PandoraNamespace;
  p_fingerprint: string;
  p_status: "completed" | "failed";
  p_response_hash?: Nullable<string>;
  p_metadata?: Json;
};

export type FinishIdempotencyRecordRow = {
  record_id: DbId;
  final_status: "completed" | "failed";
};

export type PublicTables = {
  memory_items: Table<MemoryItemRow>;
  memory_sources: Table<MemorySourceRow>;
  memory_patches: Table<MemoryPatchRow>;
  retrieval_logs: Table<RetrievalLogRow>;
  prompt_logs: Table<PromptLogRow>;
  audit_logs: Table<AuditLogRow>;
  idempotency_records: Table<IdempotencyRecordRow>;
  memory_ingest_response_cache: Table<MemoryIngestResponseCacheRow>;
  people: Table<PersonRow>;
  relationships: Table<RelationshipRow>;
  relationship_events: Table<RelationshipEventRow>;
  business_entities: Table<BusinessEntityRow>;
  business_deals: Table<BusinessDealRow>;
  promises: Table<PromiseRow>;
  decisions: Table<DecisionRow>;
  risks: Table<RiskRow>;
  evidence_items: Table<EvidenceItemRow>;
  au_worlds: Table<AuWorldRow>;
  au_characters: Table<AuCharacterRow>;
  au_relationships: Table<AuRelationshipRow>;
  au_scenes: Table<AuSceneRow>;
  au_consequences: Table<AuConsequenceRow>;
  au_open_threads: Table<AuOpenThreadRow>;
  au_rules: Table<AuRuleRow>;
  au_character_states: Table<AuCharacterStateRow>;
  au_relationship_states: Table<AuRelationshipStateRow>;
  au_retcons: Table<AuRetconRow>;
  au_quality_reviews: Table<AuQualityReviewRow>;
};

export type PublicFunctions = {
  claim_idempotency_record: {
    Args: ClaimIdempotencyRecordArgs;
    Returns: ClaimIdempotencyRecordRow[];
  };
  finish_idempotency_record: {
    Args: FinishIdempotencyRecordArgs;
    Returns: FinishIdempotencyRecordRow[];
  };
};

export type Database = {
  public: {
    Tables: PublicTables;
    Views: Record<string, never>;
    Functions: PublicFunctions;
    Enums: {
      pandora_namespace: PandoraNamespace;
      memory_type: MemoryType;
      memory_strength: MemoryStrength;
      canon_status: CanonStatus;
      evidence_source_type: EvidenceSourceType;
      risk_severity: RiskSeverity;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type PublicTableName = keyof PublicTables;
export type PublicTableRow<TableName extends PublicTableName> = PublicTables[TableName]["Row"];
export type PublicTableInsert<TableName extends PublicTableName> = PublicTables[TableName]["Insert"];
export type PublicTableUpdate<TableName extends PublicTableName> = PublicTables[TableName]["Update"];
export type PublicFunctionName = keyof PublicFunctions;
