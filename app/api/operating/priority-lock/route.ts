import { createPriorityLock, getActivePriorityLock } from "@/lib/operating/service";
import { createPriorityLockSchema, namespaceSchema } from "@/lib/operating/schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withOperatingApi(async () => {
    const namespace = namespaceSchema.parse(new URL(request.url).searchParams.get("namespace") ?? "real_life");
    return getActivePriorityLock(namespace);
  });
}

export function POST(request: Request) {
  return withOperatingApi(async () => {
    const input = await parseJson(request, createPriorityLockSchema);
    return createPriorityLock(input);
  });
}
