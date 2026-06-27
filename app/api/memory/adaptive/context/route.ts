import { NextRequest, NextResponse } from "next/server";
import * as service from "@/lib/services/adaptive-chatgpt-context-service";
import { namespace, withBridge } from "@/app/api/memory/adaptive/route-helper";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const ns = namespace(body.namespace);
  if (!ns) return NextResponse.json({ ok: false, blockers: ["namespace_required"] }, { status: 400 });
  const bridge = await withBridge(request, "memoryContextApiEnabled");
  if ("error" in bridge) return bridge.error;
  const data = await service.buildAdaptiveChatGptContext(bridge.client, { user_id: bridge.principal.userId, namespace: ns, query: body.query, current_task: body.current_task, max_items: body.max_items });
  return NextResponse.json({ ok: true, context: data });
}
