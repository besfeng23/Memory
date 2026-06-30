import { createOneBestNextAction, getActiveOneBestNextAction } from "@/lib/operating/service";
import { createObnaSchema, namespaceSchema } from "@/lib/operating/schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withOperatingApi(async () => {
    const namespace = namespaceSchema.parse(new URL(request.url).searchParams.get("namespace") ?? "real_life");
    return getActiveOneBestNextAction(namespace);
  });
}

export function POST(request: Request) {
  return withOperatingApi(async () => {
    const input = await parseJson(request, createObnaSchema);
    return createOneBestNextAction(input);
  });
}
