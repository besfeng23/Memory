import { createProjectOpenLoop } from "@/lib/operating/projects";
import { createProjectOpenLoopSchema } from "@/lib/operating/project-schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

type Params = Promise<{ projectKey: string }>;

export async function POST(request: Request, context: { params: Params }) {
  return withOperatingApi(async () => {
    const { projectKey } = await context.params;
    const input = await parseJson(request, createProjectOpenLoopSchema);
    return createProjectOpenLoop(projectKey, input);
  });
}
