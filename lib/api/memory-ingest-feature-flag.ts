export const MEMORY_INGEST_ROUTE_FEATURE_FLAG = "PANDORA_ENABLE_MEMORY_INGEST_ROUTE" as const;

export type MemoryIngestRouteFeatureEnv = Record<string, string | undefined>;

export type MemoryIngestRouteFeatureState = {
  enabled: boolean;
  flagName: typeof MEMORY_INGEST_ROUTE_FEATURE_FLAG;
  status: "disabled" | "enabled";
};

export function isMemoryIngestRouteEnabled(env: MemoryIngestRouteFeatureEnv = process.env): boolean {
  return env[MEMORY_INGEST_ROUTE_FEATURE_FLAG] === "true";
}

export function getMemoryIngestRouteFeatureState(
  env: MemoryIngestRouteFeatureEnv = process.env,
): MemoryIngestRouteFeatureState {
  const enabled = isMemoryIngestRouteEnabled(env);

  return {
    enabled,
    flagName: MEMORY_INGEST_ROUTE_FEATURE_FLAG,
    status: enabled ? "enabled" : "disabled",
  };
}
