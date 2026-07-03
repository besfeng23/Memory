import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const productionFiles = ["app/pandora/page.tsx", "components/pandora/PandoraDashboard.tsx"];

describe("Pandora production dashboard guards", () => {
  it("does not import mock data from the route or dashboard shell", () => {
    for (const file of productionFiles) expect(readFileSync(file, "utf8")).not.toMatch(/mock-data/);
  });

  it("does not accept user_id query params or props for dashboard loading", () => {
    const page = readFileSync("app/pandora/page.tsx", "utf8");
    expect(page).not.toMatch(/searchParams/);
    expect(page).not.toMatch(/searchParams.*user_id|searchParams.*userId|query.*user_id|query.*userId/s);
    expect(page).toContain("session.session.userId");
  });

  it("does not ship fake accuracy claims in production dashboard code", () => {
    const files = ["app/pandora/page.tsx", "components/pandora/PandoraDashboard.tsx", "components/pandora/StatCard.tsx", "components/pandora/DiagnosticsCard.tsx", "lib/services/pandora-dashboard-service.ts"];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("94.3");
      expect(source).not.toMatch(/retrieval accuracy/i);
    }
  });
});
