import {
  MEMORY_INGEST_ROUTE_FEATURE_FLAG,
  isMemoryIngestRouteEnabled,
  type MemoryIngestRouteFeatureEnv,
} from "@/lib/api/memory-ingest-feature-flag";

export type MemoryIngestRuntimeEnv = MemoryIngestRouteFeatureEnv & {
  NODE_ENV?: string;
};

export type MemoryIngestTestModeState = {
  enabled: boolean;
  flagName: typeof MEMORY_INGEST_ROUTE_FEATURE_FLAG;
  mode: "disabled" | "test_enabled" | "blocked_non_test";
};

export function getMemoryIngestTestModeState(
  env: MemoryIngestRuntimeEnv = process.env,
): MemoryIngestTestModeState {
  const flagEnabled = isMemoryIngestRouteEnabled(env);

  if (!flagEnabled) {
    return {
      enabled: false,
      flagName: MEMORY_INGEST_ROUTE_FEATURE_FLAG,
      mode: "disabled",
    };
  }

  if (env.NODE_ENV !== "test") {
    return {
      enabled: false,
      flagName: MEMORY_INGEST_ROUTE_FEATURE_FLAG,
      mode: "blocked_non_test",
    };
  }

  return {
    enabled: true,
    flagName: MEMORY_INGEST_ROUTE_FEATURE_FLAG,
    mode: "test_enabled",
  };
}

export function isMemoryIngestTestModeEnabled(env: MemoryIngestRuntimeEnv = process.env): boolean {
  return getMemoryIngestTestModeState(env).enabled;
}
