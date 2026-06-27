import { NextRequest, NextResponse } from "next/server";
import { namespace, withBridge } from "@/app/api/memory/adaptive/route-helper";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){ const body=await request.json().catch(()=>({})); const ns=namespace(body.namespace); if(!ns)return NextResponse.json({ok:false,blockers:["namespace_required"]},{status:400}); const gates=body.dry_run?["memoryContextApiEnabled"] as const:["memoryCaptureApiEnabled","memoryDistillationEnabled"] as const; const bridge=await withBridge(request,[...gates]); if("error" in bridge)return bridge.error; return NextResponse.json({ok:false,blockers:["profile_refresh_not_available"],next_step:"Use a reviewed profile compaction job."},{status:501}); }
