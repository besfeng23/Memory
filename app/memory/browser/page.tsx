import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function MemoryBrowserPage() {
  redirect("/admin/memory/browser?namespace=real_life");
}
