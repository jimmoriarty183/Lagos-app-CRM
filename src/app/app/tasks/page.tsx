import { notFound } from "next/navigation";
import { isPlatformModuleEnabled } from "@/config/modules";

export default function PlatformTasksPage() {
  if (!isPlatformModuleEnabled("tasks")) {
    notFound();
  }

  return null;
}
