import type { MemoryBridgeNamespace } from "@/lib/services/memory-bridge-service";
import { detectSecrets } from "@/lib/services/memory-redaction-service";

export type AutoRetrieveDecision = { shouldRetrieve: boolean; namespace: MemoryBridgeNamespace; reason: string; retrievalMode: "context_pack" | "hybrid" | "none"; confidence: number; triggers: string[] };
export type AutoCandidateDecision = { shouldCreateCandidate: boolean; namespace: MemoryBridgeNamespace; requiresReview: boolean; sensitivity: "low" | "medium" | "high" | "private"; reason: string; confidence: number; triggers: string[] };

type Input = { userMessage: string; namespace?: MemoryBridgeNamespace; currentTask?: string };
const has = (text: string, words: RegExp[]) => words.some((w) => w.test(text));
function text(input: { userMessage: string; assistantResponse?: string; currentTask?: string; conversationType?: string; source?: string }) { return [input.userMessage, input.assistantResponse, input.currentTask, input.conversationType, input.source].filter(Boolean).join("\n").toLowerCase(); }

const auSignals = [/\bau\b/i, /canon/i, /fiction(al)?/i, /story continuity/i, /melodee/i, /mang rudy/i, /mang bert/i, /ate dhes/i, /joven\/melodee/i, /writing canon/i, /chapter continuation/i, /serialized fiction/i];
const realSignals = [/github/i, /vercel/i, /supabase/i, /deploy/i, /\bci\b/i, /\bpr\b|pull request/i, /memory repo/i, /pandora memory/i, /\bplp\b/i, /hatid/i, /speedcash/i, /speedypay/i, /retargetos/i, /ai growthos/i, /business/i, /relationship loop/i, /patty/i, /gambling/i, /money risk/i, /reputation risk/i, /life priorit/i];
export function inferMemoryNamespace(input: Input): MemoryBridgeNamespace { if (input.namespace) return input.namespace; const combined = `${input.userMessage}\n${input.currentTask ?? ""}`; if (has(combined, auSignals) && !has(combined, realSignals)) return "au"; return "real_life"; }

const retrieveTriggers: [string, RegExp[]][] = [
  ["deployment_context", [/github|vercel|supabase|deploy|migration|production|environment/i]],
  ["repo_context", [/repo|branch|issue|pull request|\bpr\b|merge|\bci\b|build/i]],
  ["fix_or_merge_command", [/fix it|merge it|deploy it|check (this|it)|debug/i]],
  ["what_next", [/what next|next\??|continue|from here|same project/i]],
  ["project_continuity", [/project|pandora|memory|plp|hatid|speedcash|retargetos|ai growthos/i]],
  ["risk_context", [/gambling|money risk|reputation risk|legal risk|health|safety/i]],
  ["relationship_loop", [/relationship|patty|emotional loop|avoidance loop/i]],
  ["au_canon", [/\bau\b|canon|fiction|melodee|mang rudy|mang bert|ate dhes|chapter|serialized/i]],
  ["open_loop", [/blocked|blocker|open loop|unresolved|pending|decision/i]],
];
const skipRetrieve = [/^\s*\d+\s*[+\-*/]\s*\d+\s*\??\s*$/, /explain .{0,30}$/i, /translate/i, /recipe|cook|food/i, /joke/i];
export function shouldAutoRetrieveMemory(input: { userMessage: string; conversationType?: string; namespace?: MemoryBridgeNamespace; currentTask?: string }): AutoRetrieveDecision { const ns = inferMemoryNamespace(input); const combined = text(input); if (skipRetrieve.some((r) => r.test(input.userMessage)) && !has(combined, [...auSignals, ...realSignals])) return { shouldRetrieve: false, namespace: ns, reason: "low_signal_one_off", retrievalMode: "none", confidence: 0.15, triggers: [] }; const triggers = retrieveTriggers.filter(([, regs]) => has(combined, regs)).map(([name]) => name); const shouldRetrieve = triggers.length > 0; return { shouldRetrieve, namespace: ns, reason: shouldRetrieve ? "important_continuity_context_detected" : "no_autoretrieve_trigger_detected", retrievalMode: shouldRetrieve ? "hybrid" : "none", confidence: Math.min(0.95, 0.45 + triggers.length * 0.1), triggers }; }

const candidateTriggers: [string, RegExp[]][] = [
  ["preference", [/i prefer|my preference|remember that i|from now on|use .* tone|answer style|operating style/i]],
  ["project_decision", [/decided|decision|we will|ship|merge|blocked|ready|failed|approved|rejected/i]],
  ["deployment_truth", [/deployed|deployment|vercel|supabase migration|migration applied|build passed|build failed|ci passed|ci failed/i]],
  ["env_configuration", [/env|environment variable|runtime flag|configuration|config/i]],
  ["business_priority", [/business priority|priority is|plp|hatid|speedcash|retargetos|ai growthos/i]],
  ["risk", [/gambling|money risk|reputation risk|legal risk/i]],
  ["relationship_or_emotional_loop", [/relationship|patty|emotional loop|avoidance|relapse|fantasy-vs-execution/i]],
  ["au_canon", [/\bau\b|canon|fiction|melodee|mang rudy|mang bert|ate dhes|chapter|serialized/i]],
  ["open_loop", [/open loop|next action|todo|follow up|unresolved|blocked by/i]],
  ["correction", [/correction|actually|not true|wrong|instead/i]],
];
const skipCandidate = [/what is |explain |calculate|^\s*\d+\s*[+\-*/]\s*\d+/, /joke|lol|haha/i];
export function shouldAutoCreateMemoryCandidate(input: { userMessage: string; assistantResponse?: string; namespace?: MemoryBridgeNamespace; source?: string; currentTask?: string }): AutoCandidateDecision { const ns = inferMemoryNamespace(input); const combined = text(input); if (detectSecrets(`${input.userMessage}\n${input.assistantResponse ?? ""}`).detected) return { shouldCreateCandidate: true, namespace: ns, requiresReview: true, sensitivity: "private", reason: "secret_or_credential_block_candidate", confidence: 0.99, triggers: ["secret_or_credential"] }; if (skipCandidate.some((r) => r.test(input.userMessage)) && !has(combined, [...auSignals, ...realSignals])) return { shouldCreateCandidate: false, namespace: ns, requiresReview: false, sensitivity: "low", reason: "low_signal_temporary_exchange", confidence: 0.2, triggers: [] }; const triggers = candidateTriggers.filter(([, regs]) => has(combined, regs)).map(([name]) => name); const high = triggers.includes("risk"); const priv = triggers.includes("relationship_or_emotional_loop") || /health|legal|private/i.test(combined); const au = triggers.includes("au_canon"); const should = triggers.length > 0; const sensitivity = priv ? "private" : high ? "high" : au || triggers.includes("project_decision") || triggers.includes("deployment_truth") || triggers.includes("business_priority") ? "medium" : "low"; return { shouldCreateCandidate: should, namespace: au && !input.namespace ? "au" : ns, requiresReview: sensitivity === "high" || sensitivity === "private", sensitivity, reason: should ? "durable_memory_signal_detected" : "no_durable_memory_signal_detected", confidence: Math.min(0.96, 0.48 + triggers.length * 0.1), triggers }; }
