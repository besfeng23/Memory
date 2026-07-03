import type { LucideIcon } from "lucide-react";

export type ColorKey = "emerald" | "indigo" | "blue" | "amber" | "purple" | "red" | "slate";

export type DashboardStatData = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  color: ColorKey;
  sparklineData: number[];
};

export type StatItem = DashboardStatData & {
  icon: LucideIcon;
};

export type MemorySpace = {
  id: "real_life" | "au";
  label: string;
  type: string;
  description: string;
  memories: number;
  people: number;
  projects: number;
  status: "Active" | "Archived" | "Degraded";
  color: ColorKey;
};

export type TimelineEventData = {
  id: string;
  title: string;
  time: string;
  desc: string;
  namespace: "real_life" | "au";
  color: ColorKey;
};

export type TimelineEvent = TimelineEventData & {
  icon: LucideIcon;
};

export type WorkQueueData = {
  needsReview: number;
  openLoops: number;
  stalePacks: number;
  failedTests: number;
  profileRefreshDue: number;
  packSupersessionNeeded: number;
  peopleMapDesignNeeded: number;
};

export type SystemRow = {
  label: string;
  value: string;
  state: "healthy" | "gated" | "attention" | "idle";
};

export type ProfileSnapshot = {
  name: string;
  status: string;
  confidencePercent: number;
  confidenceLabel: string;
  summary: string;
  lastRefreshed: string;
  traits: string[];
  evidence: string;
};

export type VerificationStatus = "pass" | "warning" | "fail" | "not_run";
export type PandoraNamespace = "real_life" | "au";

export type PackMetadata = {
  id: string;
  namespace: PandoraNamespace;
  packType: string;
  status: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  supersededAt?: string;
};

export type NamespaceVerificationSummary = {
  namespace: PandoraNamespace;
  status: VerificationStatus;
  activeMasterCount: number;
  archivedMasterCount: number;
  newestActiveMaster: PackMetadata | null;
  previousArchivedMaster: PackMetadata | null;
  duplicateActiveMasterIds: string[];
  warnings: string[];
};

export type PackSupersessionSummary = {
  status: VerificationStatus;
  namespaces: NamespaceVerificationSummary[];
  warnings: string[];
};

export type RetrievalEvalSummary = {
  status: VerificationStatus;
  source: string;
  latestRunId: string | null;
  latestRunAt: string | null;
  resultLabel: string;
  realResultAvailable: boolean;
  warnings: string[];
};

export type AuditEvidenceItem = {
  id: string;
  action: string;
  namespace: PandoraNamespace | "unknown";
  recordId: string;
  createdAt: string;
};

export type SmokeEvidenceSummary = {
  status: VerificationStatus;
  latest: AuditEvidenceItem | null;
  warnings: string[];
};

export type PandoraVerificationData = {
  generatedAt: string;
  status: VerificationStatus;
  namespaces: NamespaceVerificationSummary[];
  packSupersession: PackSupersessionSummary;
  retrievalEval: RetrievalEvalSummary;
  auditEvidence: AuditEvidenceItem[];
  smokeEvidence: SmokeEvidenceSummary;
  invariantStatus: {
    exactlyOneActiveMasterPerNamespace: VerificationStatus;
    noCrossNamespacePackMixing: VerificationStatus;
    noDuplicateActiveMaster: VerificationStatus;
    retrievalEvalHasNoFabricatedScore: VerificationStatus;
    smokeEvidence: VerificationStatus;
  };
  warnings: string[];
};


export type OperatorActionStatus = "proposed" | "dry_ran" | "approved" | "executing" | "completed" | "blocked" | "failed" | "cancelled";
export type OperatorActionType = "verify_namespace_invariants" | "verify_pack_supersession" | "check_retrieval_eval_status" | "refresh_dashboard_snapshot" | "prepare_distill_smoke_plan";
export type OperatorActionMode = "dry_run" | "queued_only";

export type OperatorActionEventSummary = { id: string; action_id: string; user_id: string; event_type: string; message: string; metadata: Record<string, unknown>; created_at: string; };

export type OperatorActionSummary = {
  id: string;
  request_id: string;
  idempotency_key: string;
  action_type: OperatorActionType;
  namespace: PandoraNamespace | null;
  mode: OperatorActionMode;
  status: OperatorActionStatus;
  title: string;
  description: string;
  result: Record<string, unknown>;
  warnings: string[];
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  event_count?: number;
  event_preview?: OperatorActionEventSummary[];
};

export type OperatorActionCenterData = {
  actions: OperatorActionSummary[];
  warnings: string[];
  countsByStatus: Record<OperatorActionStatus, number>;
};

export type PandoraDashboardData = {
  generatedAt: string;
  operatorLabel: string;
  live: boolean;
  warnings: string[];
  hero: {
    title: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
  };
  evidence: string;
  stats: DashboardStatData[];
  memorySpaces: MemorySpace[];
  workQueue: WorkQueueData;
  profileSnapshot: ProfileSnapshot;
  timelineEvents: TimelineEventData[];
  diagnostics: {
    coreSystems: SystemRow[];
    gatedSystems: SystemRow[];
    envelope: {
      title: string;
      description: string;
    };
  };
  verification: PandoraVerificationData;
  operatorActions: OperatorActionCenterData;
};
