/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { extractPeopleMentions, compactContextResponse } from "@/lib/services/memory-distillation-service";

function ev(id: string, raw_text: string): any {
  return { id, namespace: "au", user_id: "u", source: "chatgpt_user_direct", raw_text, status: "captured", created_by: "u", created_at: "2026-07-03T00:00:00Z" };
}

describe("Sprint 1 — stabilize output (people_map + payload)", () => {
  it("drops junk capitalized sentence-openers and keeps real names", () => {
    const events = [
      ev("e1", "REINFORCED AU MEMORY RULE. Janine Tan is the character. She is agentic. Mang Jun is raw. Do not link real identity. Keep this. User asked to save."),
    ];
    const people = extractPeopleMentions(events);
    const names = people.map((p) => p.name);

    expect(names).toContain("Janine Tan");
    expect(names).toContain("Mang Jun");
    for (const junk of ["The", "Do", "She", "He", "Keep", "User", "Rule", "Status", "Source"]) {
      expect(names).not.toContain(junk);
    }
  });

  it("drops residual common-noun false positives (Character/Dogs/Phase/Payment/...) but keeps real names", () => {
    const events = [
      ev("e1", "Janine Tan met Mang Jun. The Character and Dogs appear. Phase two, Payment and Reservation are due. Resort Command and Pandora Memory are systems. Add this. Joven Del Rosario noted it."),
    ];
    const names = extractPeopleMentions(events).map((p) => p.name);
    expect(names).toContain("Janine Tan");
    expect(names).toContain("Mang Jun");
    expect(names.some((n) => n.startsWith("Joven"))).toBe(true);
    for (const junk of ["Character", "Dogs", "Phase", "Payment", "Reservation", "Command", "Resort Command", "Pandora Memory", "Add"]) {
      expect(names).not.toContain(junk);
    }
  });

  it("counts each event once per person (no per-occurrence id duplication)", () => {
    const events = [ev("e1", "Janine Tan. Janine Tan. Janine Tan smiled at Janine Tan.")];
    const [person] = extractPeopleMentions(events);
    expect(person.name).toBe("Janine Tan");
    expect(person.event_ids).toEqual(["e1"]);
  });

  it("merges a single-token alias into its full name but keeps distinct aliases separate", () => {
    const events = [
      ev("e1", "Janine Tan arrived."),
      ev("e2", "Janine waited."),
      ev("e3", "Jana ran off."),
    ];
    const names = extractPeopleMentions(events).map((p) => p.name);
    expect(names).toContain("Janine Tan");
    expect(names).not.toContain("Janine"); // merged into "Janine Tan"
    expect(names).toContain("Jana"); // distinct alias kept
    const janine = extractPeopleMentions(events).find((p) => p.name === "Janine Tan")!;
    expect(janine.event_ids.sort()).toEqual(["e1", "e2"]);
  });

  it("caps people count and event ids per person", () => {
    const firsts = ["Aaron", "Bella", "Cara", "Dana", "Ella", "Faye", "Gina", "Hana", "Iris", "Jane", "Kira", "Lena", "Mona", "Nora", "Opal"];
    const manyPeople = firsts.map((first, i) => ev(`p${i}`, `${first} Zeta did a thing.`));
    expect(extractPeopleMentions(manyPeople).length).toBe(12);

    const manyEvents = Array.from({ length: 12 }, (_, i) => ev(`e${i}`, "Janine Tan noted something."));
    const [person] = extractPeopleMentions(manyEvents);
    expect(person.event_ids.length).toBe(8);
  });

  it("slims an oversized context response under the payload budget, and debug bypasses it", () => {
    const pack: any = {
      title: "Pandora master context pack",
      summary: "short summary",
      key_points: [],
      active_projects: [],
      people_map: [{ name: "Janine Tan", event_ids: Array.from({ length: 500 }, (_, i) => `event-${i}`), notes: ["a note"] }],
      decisions: [],
      risks: [],
      open_loops: [],
    };

    const slim = compactContextResponse(pack, [], { max_payload_chars: 3000 });
    expect(JSON.stringify(slim).length).toBeLessThanOrEqual(3000);
    expect(slim.people_map[0].event_ids.length).toBeLessThanOrEqual(3);

    const full = compactContextResponse(pack, [], { debug: true });
    expect(JSON.stringify(full).length).toBeGreaterThan(3000);
    expect(full.people_map[0].event_ids.length).toBe(500);
  });
});
