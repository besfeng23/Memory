import { updatePriorityLock } from "@/lib/operating/service";
import { updatePriorityLockSchema } from "@/lib/operating/schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withOperatingApi(async () => {
    const { id } = await context.params;
    const input = await parseJson(request, updatePriorityLockSchema);
    return updatePriorityLock(id, input);
  });
}
