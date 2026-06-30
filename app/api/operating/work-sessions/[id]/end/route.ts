import { endWorkSession } from "@/lib/operating/service";
import { endWorkSessionSchema } from "@/lib/operating/schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withOperatingApi(async () => {
    const { id } = await context.params;
    const input = await parseJson(request, endWorkSessionSchema);
    return endWorkSession(id, input);
  });
}
