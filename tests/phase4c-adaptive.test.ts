import { describe, expect, it } from "vitest";
import { detectSecrets, redactSecrets } from "../lib/services/memory-redaction-service";
import { classifyMemoryCandidatesDeterministic } from "../lib/services/memory-classification-service";
import { createCandidatesFromSession } from "../lib/services/memory-candidate-service";
import { createMemoryEmbedding } from "../lib/services/memory-embedding-service";
import { analyzeMemoryCandidatesTool, createSessionDigestTool, refreshAdaptiveProfilesTool } from "../lib/services/pandora-mcp-tools";

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
describe("Phase 4C candidate safety", () => {
  it("forces blocked status for credential-like input even when model calls are enabled", async()=>{ let inserted: unknown[] | null = null; const client={from:()=>({insert:(rows:unknown[])=>{inserted=rows; return {select:()=>Promise.resolve({data:rows,error:null})};}})} as never; const result=await createCandidatesFromSession(client,{user_id:"00000000-0000-0000-0000-000000000000",namespace:"real_life",source:"test",text:"OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456"},{PANDORA_ENABLE_MODEL_CALLS:"true"}); expect(result.candidates[0]).toMatchObject({status:"blocked_secret",memory_type:"secret_or_credential",should_capture:false}); expect(inserted).toBeTruthy(); });
});
describe("Phase 4C MCP gates", () => {
  const principal={ok:true as const,authType:"mcp_bearer_token" as const,userId:"00000000-0000-0000-0000-000000000000"};
  const client={from:()=>{throw new Error("unexpected write");}} as never;
  it("blocks adaptive candidate writes when MCP capture is disabled", async()=>{ const result=await analyzeMemoryCandidatesTool(client,principal,{namespace:"real_life",text:"we decided to ship"},{PANDORA_ENABLE_MCP_CAPTURE:"false"}); expect(result).toMatchObject({ok:false,code:"mcp_capture_disabled"}); });
  it("blocks session digest writes when MCP capture is disabled", async()=>{ const result=await createSessionDigestTool(client,principal,{namespace:"real_life",transcript_or_summary:"summary"},{PANDORA_ENABLE_MCP_CAPTURE:"false",PANDORA_ENABLE_MCP_DISTILLATION:"true"}); expect(result).toMatchObject({ok:false,code:"mcp_capture_disabled"}); });
  it("blocks profile refresh writes when MCP capture is disabled", async()=>{ const result=await refreshAdaptiveProfilesTool(client,principal,{namespace:"real_life"},{PANDORA_ENABLE_MCP_CAPTURE:"false",PANDORA_ENABLE_MCP_DISTILLATION:"true"}); expect(result).toMatchObject({ok:false,code:"mcp_capture_disabled"}); });
});
describe("Phase 4C REST gates", () => {
  it("blocks adaptive search when context API gate is disabled", async()=>{ process.env.PANDORA_ENABLE_MEMORY_CONTEXT_API="false"; const { POST } = await import("../app/api/memory/search/route"); const response=await POST(new Request("http://localhost/api/memory/search",{method:"POST",body:JSON.stringify({namespace:"real_life"})}) as never); expect(response.status).toBe(403); expect((await response.json()).blockers).toContain("memoryContextApiEnabled_disabled"); });
  it("blocks adaptive analyze when capture API gate is disabled", async()=>{ process.env.PANDORA_ENABLE_MEMORY_CAPTURE_API="false"; const { POST } = await import("../app/api/memory/adaptive/analyze/route"); const response=await POST(new Request("http://localhost/api/memory/adaptive/analyze",{method:"POST",body:JSON.stringify({namespace:"real_life",text:"decision"})}) as never); expect(response.status).toBe(403); expect((await response.json()).blockers).toContain("memoryCaptureApiEnabled_disabled"); });
});
describe("Phase 4C embeddings", () => { it("no embedding when disabled", async()=>{ const r=await createMemoryEmbedding({text:"hello",user_id:"u",namespace:"real_life",source_table:"memory_events",source_id:"00000000-0000-0000-0000-000000000000"},{PANDORA_ENABLE_EMBEDDINGS:"false"}); expect(r.enabled).toBe(false); }); });
