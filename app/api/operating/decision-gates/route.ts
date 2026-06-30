import { createDecisionGate, listDecisionGates } from "@/lib/operating/service";
import { createDecisionGateSchema, namespaceSchema } from "@/lib/operating/schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withOperatingApi(async () => {
    const namespace = namespaceSchema.parse(new URL(request.url).searchParams.get("namespace") ?? "real_life");
    return listDecisionGates(namespace);
  });
}

export function POST(request: Request) {
  return withOperatingApi(async () => {
    const input = await parseJson(request, createDecisionGateSchema);
    return createDecisionGate(input);
  });
}
