import type { MemoryBridgeNamespace, MemoryContextPack, MemoryContextPackType, MemoryEvent } from "@/lib/services/memory-bridge-service";

const riskWords = ["risk", "blocked", "blocker", "danger", "urgent", "lawsuit", "deadline", "missed", "concern", "problem"];
const openLoopWords = ["todo", "follow up", "next", "waiting", "unresolved", "open loop", "needs", "should", "must", "remember to"];
const projectWords = ["project", "phase", "launch", "release", "client", "repo", "migration", "build"];

function asSentence(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 240);
}

function eventWeight(event: MemoryEvent) {
  const importance = event.importance ?? 0;
  const sourceBoost = ["business_decision", "project_update", "relationship_observation"].includes(event.source) ? 2 : 0;
  return importance + sourceBoost;
}

function includesAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function topEvents(events: MemoryEvent[], limit = 12) {
  return [...events]
    .sort((a, b) => eventWeight(b) - eventWeight(a) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, limit);
}

export function summarizeEventsDeterministically(events: MemoryEvent[]) {
  const selected = topEvents(events, 8);
  if (selected.length === 0) return "No captured memory events are available yet.";
  return selected.map((event) => event.extracted_summary || asSentence(event.raw_text)).join("\n");
}

export function extractOpenLoops(events: MemoryEvent[]) {
  return topEvents(events.filter((event) => includesAny(event.raw_text, openLoopWords)), 10).map((event) => ({ event_id: event.id, text: asSentence(event.raw_text), source: event.source }));
}

export function extractRisks(events: MemoryEvent[]) {
  return topEvents(events.filter((event) => includesAny(event.raw_text, riskWords)), 10).map((event) => ({ event_id: event.id, text: asSentence(event.raw_text), source: event.source, sensitivity: event.sensitivity ?? "medium" }));
}

export function extractPeopleMentions(events: MemoryEvent[]) {
  const people = new Map<string, { name: string; event_ids: string[]; notes: string[] }>();
  for (const event of events) {
    for (const match of event.raw_text.matchAll(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/g)) {
      const name = match[0];
      if (["Pandora", "ChatGPT", "Memory"].includes(name)) continue;
      const entry = people.get(name) ?? { name, event_ids: [], notes: [] };
      entry.event_ids.push(event.id);
      if (entry.notes.length < 2) entry.notes.push(asSentence(event.raw_text));
      people.set(name, entry);
    }
  }
  return [...people.values()].sort((a, b) => b.event_ids.length - a.event_ids.length).slice(0, 12);
}

export function extractProjectMentions(events: MemoryEvent[]) {
  return topEvents(events.filter((event) => event.source === "project_update" || includesAny(event.raw_text, projectWords)), 10).map((event) => ({ event_id: event.id, text: asSentence(event.raw_text), source: event.source }));
}

function keyPoints(events: MemoryEvent[]) {
  return topEvents(events, 10).map((event) => ({ event_id: event.id, point: event.extracted_summary || asSentence(event.raw_text), source: event.source, importance: event.importance ?? null }));
}

export function buildDailyContextPack(namespace: MemoryBridgeNamespace, userId: string, events: MemoryEvent[]): Omit<MemoryContextPack, "id" | "created_at" | "updated_at" | "status"> {
  const selected = topEvents(events, 20);
  return {
    namespace,
    user_id: userId,
    pack_type: "daily",
    title: "Pandora daily context pack",
    summary: summarizeEventsDeterministically(selected),
    key_points: keyPoints(selected),
    active_projects: extractProjectMentions(selected),
    people_map: extractPeopleMentions(selected),
    decisions: selected.filter((event) => event.source === "business_decision").map((event) => ({ event_id: event.id, text: asSentence(event.raw_text) })),
    risks: extractRisks(selected),
    open_loops: extractOpenLoops(selected),
    generated_from_event_ids: selected.map((event) => event.id),
  };
}

export function buildMasterContextPack(namespace: MemoryBridgeNamespace, userId: string, events: MemoryEvent[]): Omit<MemoryContextPack, "id" | "created_at" | "updated_at" | "status"> {
  const selected = topEvents(events, 50);
  return {
    ...buildDailyContextPack(namespace, userId, selected),
    pack_type: "master" as MemoryContextPackType,
    title: "Pandora master context pack",
    summary: summarizeEventsDeterministically(selected),
    generated_from_event_ids: selected.map((event) => event.id),
  };
}

export function compactContextResponse(pack: MemoryContextPack | null, events: MemoryEvent[], input: { include_risks?: boolean; include_people?: boolean; include_projects?: boolean }) {
  return {
    title: pack?.title ?? "Pandora context pack unavailable",
    summary: pack?.summary ?? summarizeEventsDeterministically(events),
    key_points: pack?.key_points ?? keyPoints(events),
    active_projects: input.include_projects === false ? [] : pack?.active_projects ?? extractProjectMentions(events),
    people_map: input.include_people === false ? [] : pack?.people_map ?? extractPeopleMentions(events),
    decisions: pack?.decisions ?? [],
    risks: input.include_risks === false ? [] : pack?.risks ?? extractRisks(events),
    open_loops: pack?.open_loops ?? extractOpenLoops(events),
    operating_rules: [
      "Use Pandora context only as private operator-provided context.",
      "Do not invent facts not present in the context pack or source events.",
      "Ask before storing new long-term memories.",
    ],
  };
}
