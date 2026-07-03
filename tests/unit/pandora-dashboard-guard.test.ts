import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const productionFiles = ["app/pandora/page.tsx", "components/pandora/PandoraDashboard.tsx", "components/pandora/Sidebar.tsx", "components/pandora/MobileBottomNav.tsx"];

describe("Pandora production dashboard guards", () => {
  it("does not import mock data from the route or dashboard shell", () => {
    for (const file of productionFiles) expect(readFileSync(file, "utf8")).not.toMatch(/mock-data/);
  });

  it("does not accept user_id query params or props for dashboard loading", () => {
    const page = readFileSync("app/pandora/page.tsx", "utf8");
    const dashboard = readFileSync("components/pandora/PandoraDashboard.tsx", "utf8");
    expect(page).not.toMatch(/searchParams/);
    expect(`${page}\n${dashboard}`).not.toMatch(/searchParams\.user_id|searchParams\.userId|query\.user_id|query\.userId|body\.user_id|body\.userId|props\.userId/);
    expect(page).toContain("session.session.userId");
  });

  it("does not ship fake accuracy claims in production dashboard code", () => {
    const files = ["app/pandora/page.tsx", "components/pandora/PandoraDashboard.tsx", "components/pandora/StatCard.tsx", "components/pandora/DiagnosticsCard.tsx", "components/pandora/VerificationConsoleCard.tsx", "components/pandora/RetrievalEvalCard.tsx", "lib/services/pandora-dashboard-service.ts", "lib/services/pandora-verification-service.ts"];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("94.3");
      expect(source).not.toMatch(/retrieval accuracy/i);
    }
  });

  it("verification loader remains read-only and service-role-free", () => {
    const source = readFileSync("lib/services/pandora-verification-service.ts", "utf8");
    expect(source).not.toMatch(/insert\(|update\(|delete\(|upsert\(|rpc\(/);
    expect(source).not.toMatch(/service-role|serviceRole|SUPABASE_SERVICE_ROLE|createAdmin/i);
  });
});
