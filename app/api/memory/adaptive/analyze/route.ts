import { NextRequest, NextResponse } from "next/server";
import { namespace, withBridge } from "@/app/api/memory/adaptive/route-helper";
import { createCandidatesFromSession } from "@/lib/services/memory-candidate-service";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){ const body=await request.json().catch(()=>({})); const ns=namespace(body.namespace); if(!ns)return NextResponse.json({ok:false,blockers:["namespace_required"]},{status:400}); if(!body.text)return NextResponse.json({ok:false,blockers:["text_required"]},{status:400}); const bridge=await withBridge(request); if("error" in bridge)return bridge.error; const data=await createCandidatesFromSession(bridge.client,{user_id:bridge.principal.userId,namespace:ns,source:body.source??"adaptive_analyze",source_ref:body.source_ref,text:String(body.text),mode:body.mode}); return NextResponse.json({ok:true,...data}); }
