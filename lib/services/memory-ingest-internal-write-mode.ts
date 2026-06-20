export type MemoryIngestInternalWriteModeState = {
  enabled: boolean;
  status: "enabled_test_only" | "disabled" | "blocked_non_test";
  nodeEnv: string | undefined;
  flag: string | undefined;
  blockers: string[];
  warnings: string[];
};

export type MemoryIngestInternalWriteModeEnv = {
  NODE_ENV?: string;
  PANDORA_ENABLE_MEMORY_INGEST_INTERNAL_WRITE_MODE?: string;
};

export function getMemoryIngestInternalWriteModeState(env: MemoryIngestInternalWriteModeEnv): MemoryIngestInternalWriteModeState {
  const flag = env.PANDORA_ENABLE_MEMORY_INGEST_INTERNAL_WRITE_MODE;
  const nodeEnv = env.NODE_ENV;

  if (flag === "true" && nodeEnv === "test") {
    return {
      enabled: true,
      status: "enabled_test_only",
      nodeEnv,
      flag,
      blockers: [],
      warnings: ["internal_write_mode_test_only", "fake_repositories_only"],
    };
  }

  if (flag === "true") {
    return {
      enabled: false,
      status: "blocked_non_test",
      nodeEnv,
      flag,
      blockers: ["internal_write_mode_requires_node_env_test"],
      warnings: ["internal_write_mode_flag_ignored_outside_test"],
    };
  }

  return {
    enabled: false,
    status: "disabled",
    nodeEnv,
    flag,
    blockers: ["internal_write_mode_disabled"],
    warnings: [],
  };
}

export function isMemoryIngestInternalWriteModeEnabled(env: MemoryIngestInternalWriteModeEnv): boolean {
  return getMemoryIngestInternalWriteModeState(env).enabled;
}
