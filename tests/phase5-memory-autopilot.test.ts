import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { resolvePandoraMemoryAutopilotMode, resolvePandoraRuntimeSafetyConfig } from "../lib/config/pandora-runtime-safety-config";
import { inferMemoryNamespace, shouldAutoCreateMemoryCandidate, shouldAutoRetrieveMemory } from "../lib/services/memory-autopilot-policy-service";
import { runPostAnswerTurn } from "../lib/services/memory-adaptive-turn-service";
import { POST } from "../app/api/memory/adaptive/turn/route";
import { adaptiveTurnTool } from "../lib/services/pandora-mcp-tools";

afterEach(()=>vi.restoreAllMocks());
const envOn={PANDORA_ENABLE_MEMORY_AUTOPILOT:"true",PANDORA_MEMORY_AUTOPILOT:"queue",PANDORA_AUTO_RETRIEVE:"true",PANDORA_AUTO_CANDIDATE_QUEUE:"true",PANDORA_ENABLE_MEMORY_CONTEXT_API:"true",PANDORA_ENABLE_MEMORY_CAPTURE_API:"true"};

describe("Phase 5A memory autopilot policy",()=>{
  it("adds safe default runtime flags and mode parsing",()=>{ const r=resolvePandoraRuntimeSafetyConfig({}); expect(r.config.memoryAutopilotEnabled).toBe(false); expect(r.config.autoRetrieveEnabled).toBe(false); expect(r.config.autoCandidateQueueEnabled).toBe(false); expect(r.config.autoCaptureLowRiskEnabled).toBe(false); expect(r.config.sensitiveMemoryRequiresApproval).toBe(true); expect(resolvePandoraMemoryAutopilotMode({PANDORA_MEMORY_AUTOPILOT:"queue"})).toBe("queue"); expect(resolvePandoraMemoryAutopilotMode({PANDORA_MEMORY_AUTOPILOT:"bad"})).toBe("off"); });
  it.each([
    ["Fix the GitHub/Vercel/Supabase deployment for this repo", "deployment_context"],
    ["The PR merge failed in CI, check it", "repo_context"],
    ["what next?", "what_next"],
    ["continue from here", "what_next"],
    ["gambling and money risk are showing again", "risk_context"],
    ["Patty relationship loop is repeating", "relationship_loop"],
    ["Continue the Melodee AU canon chapter", "au_canon"],
  ])("retrieves for %s",(msg,trigger)=>{ const d=shouldAutoRetrieveMemory({userMessage:msg}); expect(d.shouldRetrieve).toBe(true); expect(d.triggers).toContain(trigger); });
  it("infers au for story canon and skips low signal prompts",()=>{ expect(inferMemoryNamespace({userMessage:"Continue the Mang Rudy canon"})).toBe("au"); expect(shouldAutoRetrieveMemory({userMessage:"2+2?"}).shouldRetrieve).toBe(false); expect(shouldAutoRetrieveMemory({userMessage:"Explain photosynthesis"}).shouldRetrieve).toBe(false); });
  it.each([
    ["I prefer blunt concise answers", "preference", false],
    ["Decision: ship the Memory repo PR after CI passes", "project_decision", false],
    ["Vercel deployment failed today", "deployment_truth", false],
    ["Set PANDORA_AUTO_RETRIEVE=true in production env", "env_configuration", false],
    ["I am drifting toward gambling again", "risk", true],
    ["Patty emotional loop is back", "relationship_or_emotional_loop", true],
    ["AU canon: Melodee remembers Mang Bert", "au_canon", false],
  ])("creates candidate for %s",(msg,trigger,review)=>{ const d=shouldAutoCreateMemoryCandidate({userMessage:msg}); expect(d.shouldCreateCandidate).toBe(true); expect(d.triggers).toContain(trigger); expect(d.requiresReview).toBe(review); });
  it("skips generic low signal and marks secrets private",()=>{ expect(shouldAutoCreateMemoryCandidate({userMessage:"Tell me a joke"}).shouldCreateCandidate).toBe(false); const secret=shouldAutoCreateMemoryCandidate({userMessage:"api_key=sk-abcdefghijklmnopqrstuvwxyz123456"}); expect(secret).toMatchObject({shouldCreateCandidate:true,sensitivity:"private",requiresReview:true}); });
});

describe("Phase 5A adaptive turn endpoint",()=>{
  const req=(body:unknown)=>new NextRequest("https://x.test/api/memory/adaptive/turn",{method:"POST",body:JSON.stringify(body)});
  it("pre_answer returns no context when autopilot or auto retrieve disabled",async()=>{ vi.stubEnv("PANDORA_ENABLE_MEMORY_AUTOPILOT","false"); const res=await POST(req({mode:"pre_answer",user_message:"Fix the Vercel deployment"})); expect(res.status).toBe(200); const json=await res.json(); expect(json.context).toBeNull(); expect(json.should_retrieve).toBe(false); });
  it("pre_answer returns 403 when retrieval should happen but context gate disabled",async()=>{ vi.stubEnv("PANDORA_ENABLE_MEMORY_AUTOPILOT","true"); vi.stubEnv("PANDORA_MEMORY_AUTOPILOT","queue"); vi.stubEnv("PANDORA_AUTO_RETRIEVE","true"); vi.stubEnv("PANDORA_ENABLE_MEMORY_CONTEXT_API","false"); const res=await POST(req({mode:"pre_answer",user_message:"Fix the Vercel deployment"})); expect(res.status).toBe(403); expect((await res.json()).blockers).toContain("memoryContextApiEnabled_disabled"); });
  it("post_answer returns no candidate when queue disabled and 403 when capture gate disabled",async()=>{ vi.stubEnv("PANDORA_ENABLE_MEMORY_AUTOPILOT","true"); vi.stubEnv("PANDORA_MEMORY_AUTOPILOT","queue"); vi.stubEnv("PANDORA_AUTO_CANDIDATE_QUEUE","false"); let res=await POST(req({mode:"post_answer",user_message:"Decision: Vercel deployment is blocked"})); expect((await res.json()).should_create_candidate).toBe(false); vi.stubEnv("PANDORA_AUTO_CANDIDATE_QUEUE","true"); vi.stubEnv("PANDORA_ENABLE_MEMORY_CAPTURE_API","false"); res=await POST(req({mode:"post_answer",user_message:"Decision: Vercel deployment is blocked"})); expect(res.status).toBe(403); });
});

describe("Phase 5A queueing and MCP behavior",()=>{
  it("post_answer queues candidates and does not create permanent memory events",async()=>{ const calls:string[]=[]; const client={from:(table:string)=>{calls.push(table); return {insert:(rows:unknown[])=>({select:()=>Promise.resolve({data:rows,error:null})})};}} as never; const r=await runPostAnswerTurn(client,"user-1",{mode:"post_answer",namespace:"real_life",user_message:"Decision: Vercel deployment is blocked",assistant_draft:"We will queue it."},envOn); expect(r.candidates.length).toBeGreaterThan(0); expect(calls).toEqual(["memory_capture_candidates"]); });
  it("keeps real_life and au separated",()=>{ expect(shouldAutoCreateMemoryCandidate({userMessage:"AU canon: Melodee changes the ending"}).namespace).toBe("au"); expect(shouldAutoCreateMemoryCandidate({userMessage:"GitHub PR is ready"}).namespace).toBe("real_life"); });
  it("MCP pre-answer does not require capture, while post-answer does not write if capture is false",async()=>{ const client={from:()=>({select:()=>({eq:()=>({eq:()=>({eq:()=>({order:()=>({limit:()=>Promise.resolve({data:[],error:null})})})})})})})} as never; const principal={ok:true as const,authType:"mcp_bearer_token" as const,userId:"user-1"}; const pre=await adaptiveTurnTool(client,principal,{mode:"pre_answer",user_message:"2+2?"},{...envOn,PANDORA_ENABLE_MCP_CAPTURE:"false"}); expect(pre.mode).toBe("pre_answer"); const post=await adaptiveTurnTool(client,principal,{mode:"post_answer",user_message:"Decision: CI failed"},{...envOn,PANDORA_ENABLE_MCP_CAPTURE:"false"}); expect(JSON.stringify(post)).toContain("mcp_capture_disabled"); });
});
