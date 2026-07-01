import { createProjectConstraint } from "@/lib/operating/projects";
import { createProjectConstraintSchema } from "@/lib/operating/project-schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ projectKey: string }> }) {
  return withOperatingApi(async () => {
    const params = await context.params;
    const input = await parseJson(request, createProjectConstraintSchema);
    return createProjectConstraint(params.projectKey, input);
  });
}
