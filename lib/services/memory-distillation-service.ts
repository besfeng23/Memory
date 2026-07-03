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

// Roadmap Sprint 1 (#1 — stabilize output): stoplist junk entities, dedupe event ids, merge
// single-token aliases into their full name, and cap sizes so people_map stays sharp instead
// of dumping every capitalized sentence-opener as a "person".
const MAX_PEOPLE = 12;
const MAX_EVENT_IDS_PER_PERSON = 8;

// Capitalized words that are pronouns / imperatives / sentence-openers / domain labels and
// must never be treated as a person's name.
const PERSON_NAME_STOPWORDS = new Set<string>([
  "the", "a", "an", "this", "that", "these", "those", "it", "its",
  "he", "him", "his", "she", "her", "hers", "they", "them", "their", "we", "us", "our", "ours", "you", "your", "yours", "i", "me", "my", "mine",
  "do", "don", "dont", "does", "did", "doing", "done", "use", "using", "used", "add", "set", "make", "made", "ask", "treat", "note", "source",
  "keep", "avoid", "preserve", "allow", "allowed", "required", "reinforced", "working", "current", "best", "direction", "essential", "future", "important",
  "if", "when", "then", "else", "and", "but", "or", "nor", "for", "so", "yet", "not", "no", "yes", "never", "always", "only", "also",
  "before", "during", "after", "every", "each", "all", "any", "some", "main", "core", "both", "new", "old",
  "rule", "rules", "story", "scene", "scenes", "style", "canon", "user", "users", "taglish", "status",
  "pandora", "chatgpt", "memory",
]);

type PersonEntry = { name: string; event_ids: string[]; notes: string[] };

function isLikelyPersonName(name: string): boolean {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  if (PERSON_NAME_STOPWORDS.has(tokens[0].toLowerCase())) return false;
  if (tokens.length === 1) return tokens[0].length >= 3;
  return true;
}

// Merge a single-token name (e.g. "Janine") into a multi-token name that starts with it
// (e.g. "Janine Tan"). Distinct aliases with no shared full name (e.g. "Jana") stay separate.
function canonicalizePeople(people: Map<string, PersonEntry>): PersonEntry[] {
  const entries = [...people.values()];
  const multi = entries.filter((entry) => entry.name.includes(" "));
  const kept: PersonEntry[] = [];
  for (const entry of entries) {
    if (!entry.name.includes(" ")) {
      const target = multi.find((m) => m.name.split(/\s+/)[0].toLowerCase() === entry.name.toLowerCase());
      if (target && target !== entry) {
        for (const id of entry.event_ids) if (!target.event_ids.includes(id)) target.event_ids.push(id);
        for (const note of entry.notes) if (target.notes.length < 2 && !target.notes.includes(note)) target.notes.push(note);
        continue;
      }
    }
    kept.push(entry);
  }
  return kept;
}

export function extractPeopleMentions(events: MemoryEvent[], opts: { maxPeople?: number; maxEventIdsPerPerson?: number } = {}) {
  const maxPeople = opts.maxPeople ?? MAX_PEOPLE;
  const maxIds = opts.maxEventIdsPerPerson ?? MAX_EVENT_IDS_PER_PERSON;
  const people = new Map<string, PersonEntry>();
  for (const event of events) {
    // One event contributes each distinct name at most once (no per-occurrence id duplication).
    const namesInEvent = new Set<string>();
    for (const match of event.raw_text.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g)) {
      const name = match[0].trim();
      if (isLikelyPersonName(name)) namesInEvent.add(name);
    }
    for (const name of namesInEvent) {
      const entry = people.get(name) ?? { name, event_ids: [], notes: [] };
      if (!entry.event_ids.includes(event.id)) entry.event_ids.push(event.id);
      if (entry.notes.length < 2) entry.notes.push(asSentence(event.raw_text));
      people.set(name, entry);
    }
  }
  return canonicalizePeople(people)
    .sort((a, b) => b.event_ids.length - a.event_ids.length || a.name.localeCompare(b.name))
    .slice(0, maxPeople)
    .map((entry) => ({ name: entry.name, event_ids: entry.event_ids.slice(0, maxIds), notes: entry.notes }));
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

const DEFAULT_MAX_PAYLOAD_CHARS = 12000;
function payloadChars(value: unknown): number { return JSON.stringify(value).length; }

// Progressive, deterministic slimming so a context response never dumps a giant payload.
// Trims the heaviest fields first (people event ids/notes), then list lengths, then the summary.
function slimContextResponse(response: Record<string, unknown>, maxChars: number): Record<string, unknown> {
  const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
  if (payloadChars(response) <= maxChars) return response;
  response.people_map = list(response.people_map).map((person) => {
    const p = (person ?? {}) as Record<string, unknown>;
    return { ...p, event_ids: list(p.event_ids).slice(0, 3), notes: list(p.notes).slice(0, 1) };
  });
  if (payloadChars(response) <= maxChars) return response;
  response.key_points = list(response.key_points).slice(0, 6);
  response.open_loops = list(response.open_loops).slice(0, 6);
  response.risks = list(response.risks).slice(0, 6);
  response.active_projects = list(response.active_projects).slice(0, 6);
  if (payloadChars(response) <= maxChars) return response;
  response.people_map = list(response.people_map).slice(0, 6);
  response.summary = String(response.summary ?? "").slice(0, 1200);
  return response;
}

export function compactContextResponse(pack: MemoryContextPack | null, events: MemoryEvent[], input: { include_risks?: boolean; include_people?: boolean; include_projects?: boolean; max_payload_chars?: number; debug?: boolean }) {
  const response = {
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
  // debug mode returns the full payload; default responses are capped to stay compact.
  if (input.debug) return response;
  return slimContextResponse(response, Math.max(2000, Number(input.max_payload_chars ?? DEFAULT_MAX_PAYLOAD_CHARS)));
}
