import { notFound } from "next/navigation";
import { isPlatformModuleEnabled } from "@/config/modules";

export default function PlatformAcademyPage() {
  if (!isPlatformModuleEnabled("academy")) {
    notFound();
  }

  return null;
}
