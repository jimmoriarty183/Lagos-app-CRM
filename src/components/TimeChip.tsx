import { Clock } from "lucide-react";
import { cn } from "@/components/ui/utils";

type TimeChipStatus = "normal" | "upcoming" | "overdue";

export function TimeChip({
  time,
  status = "normal",
}: {
  time: string;
  status?: TimeChipStatus;
}) {
  const statusClasses: Record<TimeChipStatus, string> = {
    normal: "bg-[#F1F5F9] dark:bg-white/[0.06] text-[#475467] dark:text-white/70 border-[#E0E7FF] hover:bg-[#EEF2FF]",
    upcoming: "bg-[#FFF7ED] text-[#92400E] border-[#FED7AA] hover:bg-[#FEE2D5]",
    overdue: "bg-[#FEF2F2] dark:bg-rose-500/10 text-[#B42318] border-[#FECACA] hover:bg-[#FEE4E2]",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition",
        statusClasses[status],
      )}
      title={`Scheduled for ${time}`}
    >
      <Clock className="h-3 w-3" />
      <span>{time}</span>
    </span>
  );
}
