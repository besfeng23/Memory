import { describe, expect, it } from "vitest";
import { navItems } from "@/components/layout/nav-items";

const requiredLabels = [
  "Memory Search",
  "Memory Timeline",
  "AU Worlds",
  "Character Bible",
  "Relationship State",
  "Scene Timeline",
  "Canon Conflicts",
  "Retcon Manager",
  "Real-Life People",
  "Business / Deal Memory",
  "Risks and Promises",
  "Audit Logs",
  "Settings",
  "API / Integrations",
  "Health",
];

describe("navigation metadata", () => {
  it("marks Dashboard, Phase 3B Admin Browser, and Health as implemented", () => {
    expect(navItems.find((item) => item.label === "Dashboard")?.status).toBe("implemented");
    expect(navItems.find((item) => item.label === "Health")?.status).toBe("implemented");
    expect(navItems.find((item) => item.label === "Phase 3B Admin Browser")?.status).toBe("implemented");
  });

  it("points the implemented browser nav directly at the authenticated admin proof route", () => {
    expect(navItems.find((item) => item.label === "Phase 3B Admin Browser")?.href).toBe("/admin/memory/browser?namespace=real_life");
  });

  it("includes the planned Pandora modules", () => {
    const labels = navItems.map((item) => item.label);

    expect(labels).toEqual(expect.arrayContaining(requiredLabels));
  });

  it("does not mark planned modules as implemented", () => {
    const plannedModules = navItems.filter((item) => !["Dashboard", "Health", "Phase 3B Admin Browser"].includes(item.label));

    expect(plannedModules.length).toBeGreaterThan(0);
    expect(plannedModules.every((item) => item.status === "planned")).toBe(true);
  });
});
