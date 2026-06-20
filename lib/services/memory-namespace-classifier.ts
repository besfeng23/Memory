import type { MemoryNamespaceClassification } from "@/lib/services/memory-extraction-contract";

export type MemoryNamespaceClassifierInput = {
  text: string;
  requestedNamespace?: "real_life" | "au";
  explicitlyFictionalized?: boolean;
};

const auPattern = /\b(au|alternate universe|fictional|fictionalized|story|canon|character|scene|roleplay|rp\b|simulation|continuation|chapter|plot)\b/i;
const realLifePattern = /\b(business|company|client|deal|contract|email|money|invoice|calendar|meeting|family|mother|father|sister|brother|wife|husband|partner|work|health|doctor|government|legal|finance|bank|actual|real life|relationship)\b/i;
const sexualPattern = /\b(sexual|sex|erotic|intimate|nsfw|boundary|consent)\b/i;
const realPersonPattern = /\b(real person|actual person|my (?:boss|client|coworker|partner|wife|husband|mother|father|sister|brother|friend)|[A-Z][a-z]+\s+[A-Z][a-z]+)\b/;

export function classifyMemoryNamespace(input: MemoryNamespaceClassifierInput): MemoryNamespaceClassification {
  const text = input.text.trim();
  if (!text) return "blocked_unclear";

  const hasAu = auPattern.test(text) || input.requestedNamespace === "au";
  const hasRealLife = realLifePattern.test(text) || input.requestedNamespace === "real_life";
  const hasMixedSexualStoryWithRealPerson = (auPattern.test(text) || /\b(story|scene|character|fictionalized)\b/i.test(text)) && sexualPattern.test(text) && realPersonPattern.test(text);

  if (hasMixedSexualStoryWithRealPerson) return "mixed_requires_review";
  if (hasAu && hasRealLife && !input.explicitlyFictionalized) return "mixed_requires_review";
  if (hasAu) return "au";
  if (hasRealLife) return "real_life";
  return "blocked_unclear";
}
