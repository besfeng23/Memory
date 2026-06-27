import { z } from "zod";
import { detectSecrets, redactSecrets } from "@/lib/services/memory-redaction-service";
export const memoryTypes = ["operating_preference","tone_preference","style_preference","project_status","project_decision","project_risk","business_context","technical_context","person_context","relationship_loop","emotional_loop","money_risk","gambling_risk","health_or_safety_signal","writing_canon","au_story_canon","system_instruction","correction","open_loop","commitment","blocked_decision","secret_or_credential","noise"] as const;
export const memoryCandidateSchema = z.object({ should_capture:z.boolean(), requires_review:z.boolean(), namespace:z.enum(["real_life","au"]), memory_type:z.enum(memoryTypes), title:z.string(), summary:z.string(), raw_excerpt:z.string(), importance:z.number().int().min(1).max(10), sensitivity:z.enum(["low","medium","high","private"]), confidence:z.number().min(0).max(1), people:z.array(z.string()), projects:z.array(z.string()), risks:z.array(z.string()), tags:z.array(z.string()), reason:z.string(), suggested_source:z.string(), suggested_source_ref:z.string() });
export type MemoryCandidate = z.infer<typeof memoryCandidateSchema>;
export type ClassificationInput = { namespace?: "real_life"|"au"; text: string; source?: string; source_ref?: string; explicitSave?: boolean };
const terms = (s:string, xs:string[]) => xs.some(x=>s.includes(x));
export function classifyMemoryCandidatesDeterministic(input: ClassificationInput): MemoryCandidate[] {
  const raw = input.text.trim(); if (!raw) return [];
  const lower = raw.toLowerCase(); const secret = detectSecrets(raw).detected; const ns = input.namespace ?? (terms(lower,[" au ","canon","fic","story","melodee"]) ? "au" : "real_life");
  let memory_type: MemoryCandidate["memory_type"] = "noise", importance=2, sensitivity: MemoryCandidate["sensitivity"]="low", should=false, review=false, risks:string[]=[];
  if (secret) { memory_type="secret_or_credential"; importance=10; sensitivity="private"; should=false; review=true; risks=["secret_exposure"]; }
  else if (terms(lower,["prefer","don't overpraise","blunt","concise","style","tone"])) { memory_type= terms(lower,["tone"]) ? "tone_preference":"operating_preference"; importance=7; should=true; }
  else if (terms(lower,["decided","decision","we will","use ","ship","deployed","connected","authenticated"])) { memory_type= terms(lower,["deployed","connected","authenticated","status"]) ? "project_status":"project_decision"; importance=7; should=true; }
  else if (terms(lower,["risk","blocked","blocker","warning","failed","gambling","casino","bet "])) { memory_type= terms(lower,["gambling","casino","bet "]) ? "gambling_risk":"project_risk"; importance=8; sensitivity="high"; should=true; review=true; risks=[memory_type]; }
  else if (ns==="au" && terms(lower,["canon","character","scene","story","au"])) { memory_type="au_story_canon"; importance=7; should=true; }
  else if (terms(lower,["todo","open loop","follow up","commit","promise"])) { memory_type="open_loop"; importance=6; should=true; }
  else if (terms(lower,["my bank","health","relationship","private","legal"])) { memory_type="person_context"; importance=6; sensitivity="private"; should=true; review=true; }
  const summary = redactSecrets(raw.replace(/\s+/g," ").slice(0,500));
  return [{ should_capture: should, requires_review: review || sensitivity==="private" || sensitivity==="high", namespace: ns, memory_type, title: memory_type.replaceAll("_"," ").slice(0,80), summary, raw_excerpt: secret ? "[REDACTED_SECRET]" : summary.slice(0,300), importance, sensitivity, confidence: should ? 0.72 : 0.35, people: [], projects: [], risks, tags: [memory_type], reason: secret ? "Secret-like value detected and blocked." : should ? "High-signal durable pattern detected by deterministic classifier." : "Low-signal/no durable memory detected.", suggested_source: input.source ?? "adaptive_analysis", suggested_source_ref: input.source_ref ?? "" }];
}
export async function classifyMemoryCandidates(input: ClassificationInput) { return classifyMemoryCandidatesDeterministic(input).map(c=>memoryCandidateSchema.parse(c)); }
