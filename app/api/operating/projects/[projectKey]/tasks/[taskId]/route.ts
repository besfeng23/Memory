import { updateProjectTask } from "@/lib/operating/projects";
import { updateProjectTaskSchema } from "@/lib/operating/project-schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  return withOperatingApi(async () => {
    const params = await context.params;
    const input = await parseJson(request, updateProjectTaskSchema);
    return updateProjectTask(params.taskId, input);
  });
}
