import { getProjectContextSnapshot } from "@/lib/operating/projects";
import { namespaceSchema } from "@/lib/operating/schemas";
import { withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

type Params = Promise<{ projectKey: string }>;

export async function GET(request: Request, context: { params: Params }) {
  return withOperatingApi(async () => {
    const { projectKey } = await context.params;
    const namespace = namespaceSchema.parse(new URL(request.url).searchParams.get("namespace") ?? "real_life");
    return getProjectContextSnapshot(projectKey, namespace);
  });
}
