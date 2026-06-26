export type MemoryProductionReleaseProofDecision = "close" | "no-close";
export type MemoryProductionReleaseProofResult =
  | "passed"
  | "failed"
  | "blocked"
  | "not checked"
  | "not configured";

export interface MemoryProductionReleaseProofContract {
  releaseDate: string;
  deployedCommitSha: string;
  expectedCommitSha: string;
  vercelDeploymentUrl: string;
  operatorAccount: string;
  verificationRouteResult: MemoryProductionReleaseProofResult;
  browserRouteResult: MemoryProductionReleaseProofResult;
  auditRouteResult: MemoryProductionReleaseProofResult;
  publicRedirectResult: MemoryProductionReleaseProofResult;
  runtimeGateMatrixResult: MemoryProductionReleaseProofResult;
  supabaseRlsResult: MemoryProductionReleaseProofResult;
  sourceProofAuditResult: MemoryProductionReleaseProofResult;
  finalDecision: MemoryProductionReleaseProofDecision;
  exactBlockers: string[];
  reviewerSignOff: {
    reviewerName: string;
    reviewerRole: string;
    signedOffAt: string;
    status: MemoryProductionReleaseProofResult;
  };
  notes: string;
}
