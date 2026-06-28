/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MemoryBridgeDbClient, MemoryBridgeNamespace } from "@/lib/services/memory-bridge-service";
export async function getOpenLoops(client:MemoryBridgeDbClient,userId:string,namespace:MemoryBridgeNamespace){ return client.from("memory_open_loops").select("*").eq("user_id",userId).eq("namespace",namespace).eq("status","open").order("severity",{ascending:false}) as unknown as Promise<any>; }
export async function createOpenLoop(client:MemoryBridgeDbClient,input:any){ return client.from("memory_open_loops").insert(input).select("*").single(); }
export async function resolveOpenLoop(client:MemoryBridgeDbClient,id:string,userId:string){ return client.from("memory_open_loops").update({status:"resolved",resolved_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId).select("*").single(); }
const arr=(v:unknown)=>Array.isArray(v)?v:[];
function mergeEvidence(a:unknown,b:unknown){const seen=new Set<string>();return [...arr(a),...arr(b)].filter(x=>{const k=JSON.stringify(x);if(seen.has(k))return false;seen.add(k);return true;});}
export async function upsertOpenLoop(client:MemoryBridgeDbClient,input:{user_id:string;namespace:MemoryBridgeNamespace;loop_type:string;subject_key:string;title:string;description:string;severity:number;evidence_refs:unknown[];next_action?:string;dry_run?:boolean}){
  const existing=await (client.from("memory_open_loops").select("*").eq("user_id",input.user_id).eq("namespace",input.namespace).eq("loop_type",input.loop_type).eq("subject_key",input.subject_key).order("updated_at",{ascending:false}).limit(5) as any as Promise<{data:any[]|null;error:{message:string}|null}>);
  if(existing.error)return {ok:false,dry_run:!!input.dry_run,blockers:["open_loop_read_failed"],warnings:[existing.error.message],next_step:"Check memory_open_loops schema and RLS."};
  const active=(existing.data??[]).find(l=>["open","acknowledged"].includes(l.status));
  const row={user_id:input.user_id,namespace:input.namespace,loop_type:input.loop_type,subject_key:input.subject_key,title:input.title,description:input.description,severity:Math.max(1,Math.min(10,Number(input.severity)||3)),evidence_refs:input.evidence_refs,next_action:input.next_action,status:"open",updated_at:new Date().toISOString()};
  if(input.dry_run)return {ok:true,dry_run:true,open_loop:active?{...active,...row,severity:Math.max(Number(active.severity??0),row.severity),evidence_refs:mergeEvidence(active.evidence_refs,input.evidence_refs)}:row,blockers:[],warnings:[]};
  const result=active?await client.from("memory_open_loops").update({...row,severity:Math.max(Number(active.severity??0),row.severity),evidence_refs:mergeEvidence(active.evidence_refs,input.evidence_refs)}).eq("id",active.id).eq("user_id",input.user_id).eq("namespace",input.namespace).select("*").single():await client.from("memory_open_loops").insert(row).select("*").single();
  if(result.error||!result.data)return {ok:false,dry_run:false,blockers:["open_loop_write_failed"],warnings:[result.error?.message??"unknown open loop write failure"],next_step:"Check memory_open_loops schema and RLS."};
  return {ok:true,dry_run:false,open_loop:result.data,blockers:[],warnings:[]};
}
