import { generateOneBestNextAction } from "@/lib/operating/service";
import { namespaceSchema } from "@/lib/operating/schemas";
import { withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return withOperatingApi(async () => {
    const namespace = namespaceSchema.parse(new URL(request.url).searchParams.get("namespace") ?? "real_life");
    return generateOneBestNextAction(namespace);
  });
}
