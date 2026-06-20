import { describe, expect, it } from "vitest";
import {
  MEMORY_INGEST_ROUTE_FEATURE_FLAG,
  getMemoryIngestRouteFeatureState,
  isMemoryIngestRouteEnabled,
} from "@/lib/api/memory-ingest-feature-flag";

describe("memory ingest route feature flag", () => {
  it("is disabled by default", () => {
    expect(isMemoryIngestRouteEnabled({})).toBe(false);
    expect(getMemoryIngestRouteFeatureState({})).toEqual({
      enabled: false,
      flagName: MEMORY_INGEST_ROUTE_FEATURE_FLAG,
      status: "disabled",
    });
  });

  it("is enabled only by the exact true string", () => {
    expect(isMemoryIngestRouteEnabled({ [MEMORY_INGEST_ROUTE_FEATURE_FLAG]: "true" })).toBe(true);
    expect(isMemoryIngestRouteEnabled({ [MEMORY_INGEST_ROUTE_FEATURE_FLAG]: "TRUE" })).toBe(false);
    expect(isMemoryIngestRouteEnabled({ [MEMORY_INGEST_ROUTE_FEATURE_FLAG]: "1" })).toBe(false);
  });
});
