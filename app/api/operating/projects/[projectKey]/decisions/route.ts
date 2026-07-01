import { createProjectDecision } from "@/lib/operating/projects";
import { createProjectDecisionSchema } from "@/lib/operating/project-schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ projectKey: string }> }) {
  return withOperatingApi(async () => {
    const params = await context.params;
    const input = await parseJson(request, createProjectDecisionSchema);
    return createProjectDecision(params.projectKey, input);
  });
}
