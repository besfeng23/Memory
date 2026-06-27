import { NextRequest, NextResponse } from "next/server";
import { namespace, withBridge } from "@/app/api/memory/adaptive/route-helper";
import { getHybridMemoryContext } from "@/lib/services/memory-hybrid-retrieval-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const ns = namespace(body.namespace);
  if (!ns) return NextResponse.json({ ok: false, blockers: ["namespace_required"] }, { status: 400 });

  const bridge = await withBridge(request, "memoryContextApiEnabled");
  if ("error" in bridge) return bridge.error;

  const data = await getHybridMemoryContext(bridge.client, {
    user_id: bridge.principal.userId,
    namespace: ns,
    query: body.query,
    current_task: body.current_task,
    max_items: body.max_items,
    include_semantic: body.include_semantic,
    include_profiles: body.include_profiles,
    include_recent: body.include_recent,
    include_open_loops: body.include_open_loops,
  });
  return NextResponse.json({ ok: true, ...data });
}
