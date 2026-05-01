"use client";

import {
  BriefcaseBusiness,
  CheckSquare,
  Mail,
  MessageSquareText,
  PhoneCall,
  Users,
} from "lucide-react";
import { format } from "date-fns";

import type { TodoCalendarItem as TodoCalendarItemModel } from "@/app/b/[slug]/today/todo-calendar/types";
import {
  getItemDate,
  getItemTypeLabel,
  getShortTimeLabel,
  getItemTypeClasses,
} from "@/app/b/[slug]/today/todo-calendar/utils";
import { cn } from "@/components/ui/utils";

function ItemIcon({ item }: { item: TodoCalendarItemModel }) {
  if (item.type === "order") return <BriefcaseBusiness className="h-3.5 w-3.5" />;
  if (item.type === "checklist") return <CheckSquare className="h-3.5 w-3.5" />;
  if (item.subtype === "call") return <PhoneCall className="h-3.5 w-3.5" />;
  if (item.subtype === "message") return <MessageSquareText className="h-3.5 w-3.5" />;
  if (item.subtype === "email") return <Mail className="h-3.5 w-3.5" />;
  if (item.subtype === "meeting") return <Users className="h-3.5 w-3.5" />;
  return <MessageSquareText className="h-3.5 w-3.5" />;
}

export function TodoCalendarItem({
  item,
  compact = false,
  selected = false,
  showTypeBadge = false,
  onClick,
}: {
  item: TodoCalendarItemModel;
  compact?: boolean;
  selected?: boolean;
  /** Render a small "Follow-up" / "Order" / "Checklist" pill inside the card. */
  showTypeBadge?: boolean;
  onClick?: () => void;
}) {
  const tone = getItemTypeClasses(item.type, item.status);
  const typeLabel = getItemTypeLabel(item.type);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-start gap-2 overflow-hidden rounded-[14px] border text-left transition",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        tone.tint,
        selected ? "ring-2 ring-[#C7D2FE] ring-offset-1" : "hover:-translate-y-[1px] hover:shadow-[0_10px_20px_rgba(15,23,42,0.1)]",
      )}
      title={`${typeLabel}: ${item.title}`}
    >
      <span className={cn("absolute bottom-0 left-0 top-0 w-1.5", tone.dot)} />
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/85 dark:bg-white/15 shadow-[0_2px_6px_rgba(15,23,42,0.08)] dark:shadow-none">
        <ItemIcon item={item} />
      </span>
      <span className="min-w-0 flex-1 pl-1">
        <span className="flex flex-wrap items-center gap-1.5">
          {showTypeBadge ? (
            <span
              className={
                item.type === "follow_up"
                  ? "inline-flex items-center rounded-full border border-[var(--brand-300)] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--brand-700)]"
                  : item.type === "order"
                    ? "inline-flex items-center rounded-full border border-[#475467] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#1F2937]"
                    : "inline-flex items-center rounded-full border border-[#067647] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#067647]"
              }
            >
              {typeLabel}
            </span>
          ) : null}
          {showTypeBadge ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] opacity-70">
              Due {format(getItemDate(item), "MMM d")}
              {!item.allDay ? ` · ${getShortTimeLabel(item)}` : ""}
            </span>
          ) : !item.allDay ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] opacity-70">
              {getShortTimeLabel(item)}
            </span>
          ) : null}
          {item.status === "overdue" ? <span className="text-[10px] font-semibold uppercase tracking-[0.06em] opacity-70">Overdue</span> : null}
        </span>
        <span className={cn("mt-0.5 block truncate font-semibold", compact ? "text-[11px] leading-4" : "text-[12px] leading-4.5")}>
          {item.title}
        </span>
        {!compact && item.orderLabel ? <span className="mt-1 block truncate text-[11px] font-medium opacity-75">{item.orderLabel}</span> : null}
      </span>
    </button>
  );
}
