import { describe, expect, it } from "vitest";
import { detectSecrets, redactSecrets } from "../lib/services/memory-redaction-service";
import { classifyMemoryCandidatesDeterministic } from "../lib/services/memory-classification-service";
import { createMemoryEmbedding } from "../lib/services/memory-embedding-service";

describe("Phase 4C secret detection", () => {
  it("detects bearer tokens and OpenAI-like keys", () => { expect(detectSecrets("Bearer abcdefghijklmnopqrstuvwxyz123456").detected).toBe(true); expect(detectSecrets("sk-abcdefghijklmnopqrstuvwxyz123456").detected).toBe(true); });
  it("redacts before model/embedding", () => { expect(redactSecrets("token=abcdefghijklmnopqrstuvwxyz1234567890")).toContain("[REDACTED_SECRET]"); });
});
describe("Phase 4C classification", () => {
  it("detects operating preference", () => { expect(classifyMemoryCandidatesDeterministic({text:"I prefer blunt concise answers"})[0].memory_type).toBe("operating_preference"); });
  it("detects project decision/status", () => { expect(classifyMemoryCandidatesDeterministic({text:"We decided to deploy Pandora on Vercel"})[0].should_capture).toBe(true); });
  it("detects gambling risk", () => { expect(classifyMemoryCandidatesDeterministic({text:"Gambling risk came up again"})[0].memory_type).toBe("gambling_risk"); });
  it("detects AU canon", () => { expect(classifyMemoryCandidatesDeterministic({namespace:"au", text:"This AU canon says Melodee knows the rule"})[0].namespace).toBe("au"); });
  it("ignores low signal noise", () => { expect(classifyMemoryCandidatesDeterministic({text:"what is 2+2"})[0].should_capture).toBe(false); });
  it("blocks secrets", () => { const c=classifyMemoryCandidatesDeterministic({text:"OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456"})[0]; expect(c.memory_type).toBe("secret_or_credential"); expect(c.should_capture).toBe(false); });
});
describe("Phase 4C embeddings", () => { it("no embedding when disabled", async()=>{ const r=await createMemoryEmbedding({text:"hello",user_id:"u",namespace:"real_life",source_table:"memory_events",source_id:"00000000-0000-0000-0000-000000000000"},{PANDORA_ENABLE_EMBEDDINGS:"false"}); expect(r.enabled).toBe(false); }); });
