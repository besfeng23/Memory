import type { PandoraNamespace } from "@/lib/supabase/database.types";

export type OperatingProject = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  project_key: string;
  title: string;
  purpose: string | null;
  status: string;
  proof_target: string | null;
  current_phase: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
};

export type OperatingProjectTask = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  proof_required: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OperatingProjectDecision = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  project_id: string;
  decision: string;
  reason: string | null;
  status: string;
  source_decision_gate_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OperatingProjectConstraint = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  project_id: string;
  constraint_text: string;
  severity: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type OperatingProjectArtifact = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  project_id: string;
  title: string;
  artifact_type: string;
  uri: string | null;
  description: string | null;
  proof_value: string | null;
  created_at: string;
  updated_at: string;
};

export type OperatingProjectOpenLoop = {
  id: string;
  user_id: string;
  namespace: PandoraNamespace;
  project_id: string;
  loop_text: string;
  status: string;
  next_action: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectContextSnapshot = {
  project: OperatingProject;
  tasks: OperatingProjectTask[];
  decisions: OperatingProjectDecision[];
  constraints: OperatingProjectConstraint[];
  artifacts: OperatingProjectArtifact[];
  openLoops: OperatingProjectOpenLoop[];
};
