import { updateDecisionGate } from "@/lib/operating/service";
import { updateDecisionGateSchema } from "@/lib/operating/schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export function PATCH(request: Request, context: { params: Promise<{ gateId: string }> }) {
  return withOperatingApi(async () => {
    const { gateId } = await context.params;
    const input = await parseJson(request, updateDecisionGateSchema);
    return updateDecisionGate(gateId, input);
  });
}
