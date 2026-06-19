import { describe, expect, it } from "vitest";
import { completedPrompts, coreImplementationStatus, documentationLinks } from "@/lib/app/status";

describe("app status metadata", () => {
  it("tracks completed foundation prompts", () => {
    const titles = completedPrompts.map((item) => item.title);

    expect(titles).toContain("Foundation app");
    expect(titles).toContain("Operating documentation and contracts");
    expect(titles).toContain("Supabase migration workflow");
    expect(titles).toContain("Auth/session structure");
    expect(titles).toContain("Core database schema migration");
    expect(titles).toContain("RLS policy foundation");
    expect(titles).toContain("Typed database foundation");
    expect(titles).toContain("Repository/service foundation");
    expect(titles).toContain("Safe core repositories");
    expect(titles).toContain("Memory validation foundation");
    expect(titles).toContain("Memory candidate services");
    expect(titles).toContain("Logging services");
    expect(titles).toContain("Patch service");
    expect(titles).toContain("Retrieval service scaffold");
    expect(titles).toContain("Transaction and idempotency scaffold");
    expect(completedPrompts.every((item) => item.status === "implemented")).toBe(true);
  });

  it("keeps unimplemented core systems planned", () => {
    const plannedTitles = coreImplementationStatus
      .filter((item) => item.status === "planned")
      .map((item) => item.title);

    expect(plannedTitles).toEqual(
      expect.arrayContaining([
        "Memory engine",
        "pgvector retrieval",
        "OpenAI integration",
        "AU continuity engine",
        "GPT Actions",
        "MCP server",
      ]),
    );

    expect(plannedTitles).not.toContain("Database schema");
    expect(plannedTitles).not.toContain("RLS policies");
    expect(coreImplementationStatus.every((item) => item.status === "planned")).toBe(true);
  });

  it("uses GitHub documentation links instead of broken internal markdown routes", () => {
    expect(documentationLinks.length).toBeGreaterThan(0);

    for (const doc of documentationLinks) {
      expect(doc.href).toMatch(/^https:\/\/github\.com\/besfeng23\/Memory\/blob\/main\/docs\//);
      expect(doc.href).not.toMatch(/^\/docs\//);
    }
  });
});
