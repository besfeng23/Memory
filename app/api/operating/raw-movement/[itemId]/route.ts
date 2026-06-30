import { updateRawMovementItemStatus } from "@/lib/operating/service";
import { updateRawMovementItemSchema } from "@/lib/operating/schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  return withOperatingApi(async () => {
    const { itemId } = await context.params;
    const input = await parseJson(request, updateRawMovementItemSchema);
    return updateRawMovementItemStatus(itemId, input);
  });
}
