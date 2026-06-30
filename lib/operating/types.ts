import type { Json, PandoraNamespace } from "@/lib/supabase/database.types";

export type OperatingStatus = "active" | "new" | "reviewed" | "converted" | "parked" | "rejected" | "draft" | "go" | "kill" | "rework" | "completed" | "superseded";

export type WorkSession = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  project_key: string | null;
  declared_goal: string;
  proof_target: string | null;
  started_at: string;
  ended_at: string | null;
  status: string;
  drift_score: number | null;
  focus_score: number | null;
  outcome_summary: string | null;
  next_action: string | null;
  created_at: string;
  updated_at: string;
};

export type PriorityLock = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  project_key: string;
  locked_outcome: string;
  proof_target: string | null;
  allowed_support: string[] | null;
  blocked_distractions: string[] | null;
  locked_until: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type RawMovementItem = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  raw_text: string;
  source: string;
  suggested_conversion: Json | null;
  risk_level: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type DecisionGate = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  action_considered: string;
  desired_outcome: string | null;
  facts: string[] | null;
  assumptions: string[] | null;
  risks: string[] | null;
  authority_check: string | null;
  proof_required: string | null;
  recommendation: string | null;
  next_action: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type OneBestNextAction = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  session_id: string | null;
  priority_lock_id: string | null;
  title: string;
  reason: string | null;
  proof_target: string | null;
  timebox_minutes: number | null;
  steps: string[] | null;
  evidence_refs: Json | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type OperatingSnapshot = {
  activeWorkSession: WorkSession | null;
  activePriorityLock: PriorityLock | null;
  activeObna: OneBestNextAction | null;
  rawMovementItems: RawMovementItem[];
  decisionGates: DecisionGate[];
};

export type PriorityGateResult = {
  result: "aligned" | "support" | "possible_drift" | "blocked";
  reason: string;
  recommended_next_action: string;
};

export type SuggestedRawMovementConversion = {
  type: "proof_needed" | "risk" | "decision_gate" | "task" | "note";
  reason: string;
};
