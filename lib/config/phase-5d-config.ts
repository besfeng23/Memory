// Phase 5D configuration. All flags are OPTIONAL and safe-by-default: scoring and
// pruning stay disabled unless explicitly enabled, and pruning is review-only by
// design (the broker never hard-deletes memory). These env vars are intentionally
// NOT in REQUIRED_PROVIDER_KEYS, so an unset value never triggers RED drift.

export type Phase5dPruningMode = "review_only";

export type Phase5dConfig = {
  usefulnessScoringEnabled: boolean;
  pruningEnabled: boolean;
  pruningMode: Phase5dPruningMode;
  scoringVersion: string;
};

export const PHASE_5D_DEFAULT_SCORING_VERSION = "phase-5d-v1";

export function resolvePhase5dConfig(env: Partial<NodeJS.ProcessEnv> = process.env): Phase5dConfig {
  // Only "review_only" is honored. Any other value is coerced back to review_only so a
  // misconfigured env can never enable destructive pruning.
  const pruningMode: Phase5dPruningMode = "review_only";
  return {
    usefulnessScoringEnabled: env.PANDORA_ENABLE_MEMORY_USEFULNESS_SCORING === "true",
    pruningEnabled: env.PANDORA_ENABLE_MEMORY_PRUNING === "true",
    pruningMode,
    scoringVersion: env.PANDORA_MEMORY_SCORING_VERSION?.trim() || PHASE_5D_DEFAULT_SCORING_VERSION,
  };
}

export function phase5dGatesSummary(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const config = resolvePhase5dConfig(env);
  return {
    PANDORA_ENABLE_MEMORY_USEFULNESS_SCORING: config.usefulnessScoringEnabled,
    PANDORA_ENABLE_MEMORY_PRUNING: config.pruningEnabled,
    PANDORA_MEMORY_PRUNING_MODE: config.pruningMode,
    PANDORA_MEMORY_SCORING_VERSION: config.scoringVersion,
  };
}
