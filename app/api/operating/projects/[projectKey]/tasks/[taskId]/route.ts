import { updateProjectTask } from "@/lib/operating/projects";
import { updateProjectTaskSchema } from "@/lib/operating/project-schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

type Params = Promise<{ taskId: string }>;

export async function PATCH(request: Request, context: { params: Params }) {
  return withOperatingApi(async () => {
    const { taskId } = await context.params;
    const input = await parseJson(request, updateProjectTaskSchema);
    return updateProjectTask(taskId, input);
  });
}
