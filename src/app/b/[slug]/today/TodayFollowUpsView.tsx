"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { completeFollowUp, rescheduleFollowUp } from "@/app/b/[slug]/actions";
import {
  FollowUpCompleteDialog,
  type FollowUpCompletionValue,
} from "@/app/b/[slug]/_components/orders/FollowUpCompleteDialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/components/ui/utils";
import { TimeChip } from "@/components/TimeChip";
import { TaskGroupSection } from "@/components/TaskGroupSection";
import {
  formatFollowUpDate,
  formatFollowUpDateTime,
  getTodayDateOnly,
  getTomorrowDateOnly,
  isOverdueDateOnly,
  normalizeDateOnly,
  type FollowUpRow,
} from "@/lib/follow-ups";

export type TodayFollowUpItem = FollowUpRow & {
  orderLabel: string | null;
  orderHref: string | null;
};

export type ManagerMonthlyPlanProgress = {
  monthStart: string;
  monthEnd: string;
  daysElapsed: number;
  daysTotal: number;
  planAmount: number;
  actualAmount: number;
  forecastAmount: number;
  achievementPct: number;
  planClosedOrders: number;
  closedOrders: number;
  forecastClosedOrders: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTimeChipStatus(
  item: TodayFollowUpItem,
): "normal" | "upcoming" | "overdue" {
  const today = getTodayDateOnly();
  if (isOverdueDateOnly(item.due_date, today)) {
    return "overdue";
  }

  if (item.due_at) {
    const now = new Date();
    const dueTime = new Date(item.due_at);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    if (dueTime > now && dueTime <= twoHoursFromNow) {
      return "upcoming";
    }
  }

  return "normal";
}

function DueBadge({ dueDate }: { dueDate: string }) {
  const today = getTodayDateOnly();
  const isOverdue = dueDate < today;
  const dueDateLabel = formatFollowUpDate(dueDate);
  const daysOverdue = isOverdue
    ? Math.max(
        1,
        Math.floor(
          (new Date(`${today}T00:00:00`).getTime() -
            new Date(`${dueDate}T00:00:00`).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;
  const label = isOverdue
    ? `Overdue ${daysOverdue}d · due ${dueDateLabel}`
    : dueDate === getTomorrowDateOnly()
      ? "Tomorrow"
      : dueDate === today
        ? "Today"
        : dueDateLabel;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        isOverdue
          ? "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]"
          : "border-[#C7D2FE] bg-[#EEF2FF] text-[#3645A0]",
      )}
      title={isOverdue ? `Due ${dueDateLabel}. Overdue by ${daysOverdue} days.` : dueDateLabel}
    >
      {label}
    </span>
  );
}

function RescheduleMenu({
  item,
  onReschedule,
}: {
  item: TodayFollowUpItem;
  onReschedule: (item: TodayFollowUpItem, nextDate: string) => void;
}) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const value = normalizeDateOnly(getTodayDateOnly());
  if (value) value.setDate(value.getDate() - 365);
  const minDate = value
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    : getTodayDateOnly();

  return (
    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full transition hover:opacity-90"
          aria-label={`Reschedule ${item.title}`}
        >
          <DueBadge dueDate={item.due_date} />
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#9CA3AF]">
            <ChevronDown className="h-3 w-3" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[140] w-[min(280px,calc(100vw-1.5rem))] rounded-[18px] border-[#E5E7EB] bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.18)] max-h-[min(360px,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain"
      >
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => {
              onReschedule(item, getTodayDateOnly());
              setCalendarOpen(false);
            }}
            className="flex h-8.5 w-full items-center justify-between rounded-[12px] px-3 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
          >
            <span>Today</span>
            {item.due_date === getTodayDateOnly() ? (
              <Check className="h-4 w-4 text-[#5558E3]" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => {
              onReschedule(item, getTomorrowDateOnly());
              setCalendarOpen(false);
            }}
            className="flex h-8.5 w-full items-center justify-between rounded-[12px] px-3 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
          >
            <span>Tomorrow</span>
            {item.due_date === getTomorrowDateOnly() ? (
              <Check className="h-4 w-4 text-[#5558E3]" />
            ) : null}
          </button>
          <div className="rounded-[14px] border border-[#F3F4F6] bg-[#FBFCFE] p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
              <CalendarDays className="h-3.5 w-3.5" />
              Pick date
            </div>
            <input
              type="date"
              defaultValue={item.due_date}
              min={minDate}
              className="h-10 w-full rounded-[12px] border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#1F2937] outline-none transition focus:border-[#C7D2FE] focus:ring-4 focus:ring-[#E0E7FF]"
              onChange={(event) => {
                const nextDate = event.currentTarget.value;
                if (!nextDate) return;
                onReschedule(item, nextDate);
                setCalendarOpen(false);
              }}
            />
            <p className="mt-2 text-[11px] leading-4 text-[#9CA3AF]">
              Choosing a future date removes the item from Today.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FollowUpTodayRow({
  item,
  canManage,
  onDone,
  onReschedule,
}: {
  item: TodayFollowUpItem;
  canManage: boolean;
  onDone: (item: TodayFollowUpItem) => void;
  onReschedule: (item: TodayFollowUpItem, nextDate: string) => void;
}) {
  const hasOrderLink = Boolean(item.orderLabel && item.orderHref);
  const timeLabel = item.due_at ? formatFollowUpDateTime(item.due_at) : null;

  return (
    <article className="rounded-[16px] border border-[#E8ECF3] bg-white px-3 py-2 transition-colors hover:bg-[#FBFCFE]">
      <div className="flex items-start gap-2">
        {canManage ? (
          <button
            type="button"
            onClick={() => onDone(item)}
            className="mt-0.5 inline-flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full border border-[#D9E2EC] bg-[#F9FAFB] text-[#9CA3AF] transition hover:border-[#C7D2FE] hover:text-[#5558E3]"
            aria-label={`Mark ${item.title} as done`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span
            className="mt-0.5 inline-flex h-7.5 w-7.5 shrink-0 rounded-full border border-[#E5E7EB] bg-[#F9FAFB]"
            aria-hidden="true"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 pt-0.5 pr-2">
              <div className="flex items-center gap-2">
                <div className="truncate text-[13px] font-medium leading-5 text-[#1F2937]">
                  {item.title}
                </div>
                {timeLabel ? (
                  <TimeChip time={timeLabel} status={getTimeChipStatus(item)} />
                ) : null}
              </div>
              {hasOrderLink ? (
                <Link
                  href={item.orderHref!}
                  className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-[12px] leading-5 text-[#6B7280] transition hover:text-[#5558E3]"
                >
                  <span className="truncate">{item.orderLabel}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </Link>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {canManage ? (
                <RescheduleMenu item={item} onReschedule={onReschedule} />
              ) : (
                <DueBadge dueDate={item.due_date} />
              )}
              {canManage ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7.5 rounded-[12px] px-2.5 text-[11px] font-medium !text-white hover:!text-white shadow-none"
                  onClick={() => onDone(item)}
                >
                  Done
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function TodayFollowUpsView({
  businessSlug,
  canManage,
  initialItems,
  headerAction,
  managerPlanProgress,
}: {
  businessSlug: string;
  canManage: boolean;
  initialItems: TodayFollowUpItem[];
  headerAction?: React.ReactNode;
  managerPlanProgress?: ManagerMonthlyPlanProgress | null;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [completeDialogItem, setCompleteDialogItem] =
    React.useState<TodayFollowUpItem | null>(null);

  // Sort items: with time first (ascending by time), then without time
  const sortItemsByTime = React.useCallback((itemList: TodayFollowUpItem[]) => {
    return [...itemList].sort((a, b) => {
      const aHasTime = Boolean(a.due_at);
      const bHasTime = Boolean(b.due_at);

      // Items with time come first
      if (aHasTime && !bHasTime) return -1;
      if (!aHasTime && bHasTime) return 1;

      // Both have time: sort by time ascending
      if (aHasTime && bHasTime && a.due_at && b.due_at) {
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      }

      // Both without time: sort by created_at descending (newer first)
      return b.created_at.localeCompare(a.created_at);
    });
  }, []);

  const overdue = sortItemsByTime(
    items.filter((item) => item.due_date < getTodayDateOnly()),
  );
  const today = sortItemsByTime(
    items.filter((item) => item.due_date === getTodayDateOnly()),
  );
  const tomorrow = sortItemsByTime(
    items.filter((item) => item.due_date === getTomorrowDateOnly()),
  );

  async function handleDone(value: FollowUpCompletionValue) {
    if (!completeDialogItem) return;

    const item = completeDialogItem;
    setSavingId(item.id);
    setErrorMessage(null);
    const previous = items;
    setItems((current) => current.filter((entry) => entry.id !== item.id));

    try {
      const result = (await completeFollowUp({
        followUpId: item.id,
        businessSlug,
        completionNote: value.completionNote,
        nextFollowUp: value.nextFollowUp,
      })) as { completed: TodayFollowUpItem; next: TodayFollowUpItem | null };

      if (result.next && result.next.due_date <= getTomorrowDateOnly()) {
        const nextItem: TodayFollowUpItem = {
          ...result.next,
          orderLabel: item.orderLabel,
          orderHref: item.orderHref,
        };
        setItems((current) =>
          [...current, nextItem].sort(
            (a, b) =>
              a.due_date.localeCompare(b.due_date) ||
              b.created_at.localeCompare(a.created_at),
          ),
        );
      }

      setCompleteDialogItem(null);
      router.refresh();
    } catch (error) {
      setItems(previous);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to complete follow-up",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleReschedule(item: TodayFollowUpItem, nextDate: string) {
    setSavingId(item.id);
    setErrorMessage(null);
    const previous = items;
    const shouldKeep = nextDate <= getTodayDateOnly();
    setItems((current) =>
      shouldKeep
        ? current.map((entry) =>
            entry.id === item.id ? { ...entry, due_date: nextDate } : entry,
          )
        : current.filter((entry) => entry.id !== item.id),
    );

    try {
      await rescheduleFollowUp({
        followUpId: item.id,
        businessSlug,
        dueDate: nextDate,
      });
      router.refresh();
    } catch (error) {
      setItems(previous);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to reschedule follow-up",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-3.5">
      <div className="rounded-[22px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#ffffff_0%,#F9FAFB_100%)] px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="product-page-title text-[#111827]">Today</div>
            <p className="mt-0.5 product-body-sm text-[#6B7280]">
              Overdue and due-today actions in one compact execution view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {headerAction}
            <span className="inline-flex items-center rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-semibold text-[#B42318]">
              Overdue {overdue.length}
            </span>
            <span className="inline-flex items-center rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-semibold text-[#3645A0]">
              Today {today.length}
            </span>
            <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475467]">
              Tomorrow {tomorrow.length}
            </span>
          </div>
        </div>
        {managerPlanProgress ? (
          <div className="mt-3 rounded-[14px] border border-[#E5E7EB] bg-white px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[12px] font-semibold text-[#111827]">
                Monthly plan • {managerPlanProgress.monthStart} to {managerPlanProgress.monthEnd}
              </div>
              <div className="text-[11px] font-semibold text-[#475467]">
                Day {managerPlanProgress.daysElapsed}/{managerPlanProgress.daysTotal}
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EEF2FF]">
              <div
                className="h-full rounded-full bg-[var(--brand-600)] transition-all"
                style={{
                  width: `${Math.max(0, Math.min(100, managerPlanProgress.achievementPct))}%`,
                }}
              />
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-[11px] text-[#475467] sm:grid-cols-3">
              <div>
                Amount: {formatCurrency(managerPlanProgress.planAmount)} / {formatCurrency(managerPlanProgress.actualAmount)} / {formatCurrency(managerPlanProgress.forecastAmount)}
              </div>
              <div>
                Orders: {managerPlanProgress.planClosedOrders} / {managerPlanProgress.closedOrders} / {Math.round(managerPlanProgress.forecastClosedOrders)}
              </div>
              <div className="font-semibold text-[#111827]">
                Achievement: {managerPlanProgress.achievementPct.toFixed(1)}%
              </div>
            </div>
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm font-medium text-[#B42318]">
            {errorMessage}
          </div>
        ) : null}
      </div>

      {savingId ? (
        <div className="flex items-center gap-2 text-sm font-medium text-[#6B7280]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating follow-up...
        </div>
      ) : null}

      <TaskGroupSection
        title="Overdue"
        count={overdue.length}
        hint="Needs attention"
        tone="danger"
        defaultOpen={true}
        persistenceKey={`${businessSlug}:today:list:overdue`}
      >
        {overdue.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white/70 px-4 py-5 text-sm text-[#6B7280]">
            No overdue follow-ups right now.
          </div>
        ) : (
          <div className="space-y-1.5">
            {overdue.map((item) => (
              <FollowUpTodayRow
                key={item.id}
                item={item}
                canManage={canManage}
                onDone={(entry) => setCompleteDialogItem(entry)}
                onReschedule={(entry, nextDate) =>
                  void handleReschedule(entry, nextDate)
                }
              />
            ))}
          </div>
        )}
      </TaskGroupSection>

      <TaskGroupSection
        title="Today"
        count={today.length}
        hint="Scheduled now"
        tone="primary"
        defaultOpen={true}
        persistenceKey={`${businessSlug}:today:list:today`}
      >
        {today.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white/70 px-4 py-5 text-sm text-[#6B7280]">
            No follow-ups scheduled for today.
          </div>
        ) : (
          <div className="space-y-1.5">
            {today.map((item) => (
              <FollowUpTodayRow
                key={item.id}
                item={item}
                canManage={canManage}
                onDone={(entry) => setCompleteDialogItem(entry)}
                onReschedule={(entry, nextDate) =>
                  void handleReschedule(entry, nextDate)
                }
              />
            ))}
          </div>
        )}
      </TaskGroupSection>

      <TaskGroupSection
        title="Tomorrow"
        count={tomorrow.length}
        hint="Planned for next day"
        tone="neutral"
        defaultOpen={false}
        persistenceKey={`${businessSlug}:today:list:tomorrow`}
      >
        {tomorrow.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white/70 px-4 py-5 text-sm text-[#6B7280]">
            No follow-ups scheduled for tomorrow.
          </div>
        ) : (
          <div className="space-y-1.5">
            {tomorrow.map((item) => (
              <FollowUpTodayRow
                key={item.id}
                item={item}
                canManage={canManage}
                onDone={(entry) => setCompleteDialogItem(entry)}
                onReschedule={(entry, nextDate) =>
                  void handleReschedule(entry, nextDate)
                }
              />
            ))}
          </div>
        )}
      </TaskGroupSection>

      <FollowUpCompleteDialog
        item={completeDialogItem}
        open={Boolean(completeDialogItem)}
        submitting={Boolean(savingId)}
        onOpenChange={(open) => {
          if (!open) setCompleteDialogItem(null);
        }}
        onSubmit={(value) => void handleDone(value)}
      />
    </div>
  );
}
