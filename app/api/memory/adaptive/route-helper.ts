import { NextRequest, NextResponse } from "next/server";
import { resolveMemoryBridgePrincipal } from "@/lib/services/memory-bridge-auth";
import { createMemoryBridgeDbClientForPrincipal } from "@/lib/services/memory-bridge-db";
export function namespace(value?: string) { return value === "au" || value === "real_life" ? value : null; }
export async function withBridge(request: NextRequest) { const principal=await resolveMemoryBridgePrincipal(request); if(!principal.ok) return {error:NextResponse.json({ok:false,blockers:principal.blockers},{status:401})}; const client=await createMemoryBridgeDbClientForPrincipal(principal); return {principal,client}; }
