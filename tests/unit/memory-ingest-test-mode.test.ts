import { describe, expect, it } from "vitest";
import { MEMORY_INGEST_ROUTE_FEATURE_FLAG } from "@/lib/api/memory-ingest-feature-flag";
import { getMemoryIngestTestModeState, isMemoryIngestTestModeEnabled } from "@/lib/api/memory-ingest-test-mode";

describe("memory ingest test mode", () => {
  it("is disabled when the route flag is absent", () => {
    const state = getMemoryIngestTestModeState({ NODE_ENV: "test" });

    expect(state.enabled).toBe(false);
    expect(state.mode).toBe("disabled");
    expect(isMemoryIngestTestModeEnabled({ NODE_ENV: "test" })).toBe(false);
  });

  it("blocks the route flag outside test runtime", () => {
    const state = getMemoryIngestTestModeState({
      NODE_ENV: "production",
      [MEMORY_INGEST_ROUTE_FEATURE_FLAG]: "true",
    });

    expect(state.enabled).toBe(false);
    expect(state.mode).toBe("blocked_non_test");
  });

  it("enables only inside test runtime with the exact true flag", () => {
    const state = getMemoryIngestTestModeState({
      NODE_ENV: "test",
      [MEMORY_INGEST_ROUTE_FEATURE_FLAG]: "true",
    });

    expect(state.enabled).toBe(true);
    expect(state.mode).toBe("test_enabled");
  });
});
