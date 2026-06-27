/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MemoryBridgeDbClient, MemoryBridgeNamespace } from "@/lib/services/memory-bridge-service";
export async function getOpenLoops(client:MemoryBridgeDbClient,userId:string,namespace:MemoryBridgeNamespace){ return client.from("memory_open_loops").select("*").eq("user_id",userId).eq("namespace",namespace).eq("status","open").order("severity",{ascending:false}) as unknown as Promise<any>; }
export async function createOpenLoop(client:MemoryBridgeDbClient,input:any){ return client.from("memory_open_loops").insert(input).select("*").single(); }
export async function resolveOpenLoop(client:MemoryBridgeDbClient,id:string,userId:string){ return client.from("memory_open_loops").update({status:"resolved",resolved_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId).select("*").single(); }
