import { isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ProjectStatus } from "@/lib/app/status";

const cases: Array<{ status: ProjectStatus; label: string }> = [
  { status: "implemented", label: "Implemented" },
  { status: "foundation", label: "Foundation" },
  { status: "planned", label: "Planned" },
  { status: "stubbed", label: "Stubbed" },
  { status: "blocked", label: "Blocked" },
];

type BadgeElement = ReactElement<{ children: string; className: string }>;

describe("StatusBadge", () => {
  it.each(cases)("renders the $label label and matching status class", ({ status, label }) => {
    const element = StatusBadge({ status });

    expect(isValidElement(element)).toBe(true);

    const props = (element as BadgeElement).props;
    expect(props.children).toBe(label);
    expect(props.className).toContain("status-badge");
    expect(props.className).toContain(`status-badge--${status}`);
  });
});
