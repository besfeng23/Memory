import { createOperatingProject, listOperatingProjects } from "@/lib/operating/projects";
import { namespaceSchema } from "@/lib/operating/schemas";
import { createOperatingProjectSchema } from "@/lib/operating/project-schemas";
import { parseJson, withOperatingApi } from "@/lib/operating/http";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withOperatingApi(async () => {
    const namespace = namespaceSchema.parse(new URL(request.url).searchParams.get("namespace") ?? "real_life");
    return listOperatingProjects(namespace);
  });
}

export function POST(request: Request) {
  return withOperatingApi(async () => {
    const input = await parseJson(request, createOperatingProjectSchema);
    return createOperatingProject(input);
  });
}
