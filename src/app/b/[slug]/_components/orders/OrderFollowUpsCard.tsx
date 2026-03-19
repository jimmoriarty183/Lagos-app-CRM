"use client";

import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CalendarDays, Check, ChevronDown, CirclePlus, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { completeFollowUp, createFollowUp, updateFollowUpStatus } from "@/app/b/[slug]/actions";
import { emitOrderActivityRefresh } from "@/app/b/[slug]/_components/orders/order-activity";
import {
  FollowUpCompleteDialog,
  type FollowUpCompletionValue,
} from "@/app/b/[slug]/_components/orders/FollowUpCompleteDialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/components/ui/utils";
import {
  formatDateOnlyForStorage,
  formatFollowUpDate,
  getRelativeFollowUpLabel,
  getTodayDateOnly,
  getTomorrowDateOnly,
  isOverdueDateOnly,
  normalizeDateOnly,
  type FollowUpRow,
} from "@/lib/follow-ups";

type Props = {
  businessId: string;
  businessSlug: string;
  orderId: string;
  canManage: boolean;
  supabase: SupabaseClient;
  currentUserName?: string;
  userRole?: "OWNER" | "MANAGER" | "GUEST";
};

type FollowUpListItem = FollowUpRow;

function sortItems(items: FollowUpListItem[]) {
  return [...items].sort((a, b) => {
    if (a.status === "open" && b.status !== "open") return -1;
    if (a.status !== "open" && b.status === "open") return 1;
    if (a.status === "open" && b.status === "open") {
      const dueCompare = a.due_date.localeCompare(b.due_date);
      if (dueCompare !== 0) return dueCompare;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function DueShortcutButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition",
        active
          ? "border-[#C7D2FE] bg-[#EEF2FF] text-[#3645A0]"
          : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#D6DAE1] hover:text-[#374151]",
      )}
    >
      {children}
    </button>
  );
}

function DueBadge({ dueDate }: { dueDate: string }) {
  const today = getTodayDateOnly();
  const overdue = isOverdueDateOnly(dueDate, today);
  const label = getRelativeFollowUpLabel(dueDate, today);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        overdue
          ? "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]"
          : dueDate === today
            ? "border-[#C7D2FE] bg-[#EEF2FF] text-[#3645A0]"
            : "border-[#E5E7EB] bg-[#F9FAFB] text-[#4B5563]",
      )}
      title={formatFollowUpDate(dueDate)}
    >
      {label}
    </span>
  );
}

function FollowUpItemRow({
  item,
  canManage,
  onToggleDone,
  onReopen,
}: {
  item: FollowUpListItem;
  canManage: boolean;
  onToggleDone: (item: FollowUpListItem, done: boolean) => void;
  onReopen: (item: FollowUpListItem) => void;
}) {
  const completed = item.status === "done";

  return (
    <div
      className={cn(
        "rounded-[18px] border px-3.5 py-3 transition",
        completed
          ? "border-[#E5E7EB] bg-[#FBFBFC]"
          : "border-[#E8ECF3] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)]",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={!canManage}
          onClick={() => onToggleDone(item, !completed)}
          className={cn(
            "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition",
            completed
              ? "border-[#D1FADF] bg-[#ECFDF3] text-[#067647]"
              : "border-[#D9E2EC] bg-[#F9FAFB] text-[#9CA3AF] hover:border-[#C7D2FE] hover:text-[#5558E3]",
          )}
          aria-label={completed ? "Reopen follow-up" : "Mark follow-up as done"}
        >
          {completed ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn("text-sm font-semibold", completed ? "text-[#6B7280] line-through" : "text-[#1F2937]")}>
              {item.title}
            </div>
            <DueBadge dueDate={item.due_date} />
            {item.status === "cancelled" ? (
              <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[11px] font-semibold text-[#6B7280]">
                Cancelled
              </span>
            ) : null}
          </div>
          {item.note?.trim() ? (
            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-[#6B7280]">
              {item.note.trim()}
            </p>
          ) : null}
          {item.completion_note?.trim() ? (
            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-[#475467]">
              Completed note: {item.completion_note.trim()}
            </p>
          ) : null}
          {completed && canManage ? (
            <button
              type="button"
              onClick={() => onReopen(item)}
              className="mt-2 text-xs font-semibold text-[#5558E3] transition hover:text-[#3645A0]"
            >
              Reopen
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function OrderFollowUpsCard({
  businessId,
  businessSlug,
  orderId,
  canManage,
  supabase,
}: Props) {
  const router = useRouter();
  const [items, setItems] = React.useState<FollowUpListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [note, setNote] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [dueDate, setDueDate] = React.useState(getTodayDateOnly());
  const [completeDialogItem, setCompleteDialogItem] = React.useState<FollowUpListItem | null>(null);

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("business_id", businessId)
      .eq("order_id", orderId)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setItems(sortItems((data ?? []) as FollowUpListItem[]));
    setErrorMessage(null);
    setLoading(false);
  }, [businessId, orderId, supabase]);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const openItems = items.filter((item) => item.status === "open");
  const completedItems = items.filter((item) => item.status !== "open");
  const selectedDate = normalizeDateOnly(dueDate);

  async function handleCreate() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || saving) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      const created = (await createFollowUp({
        businessId,
        businessSlug,
        orderId,
        title: trimmedTitle,
        dueDate,
        note: note.trim() || null,
        source: "order",
      })) as FollowUpListItem;

      setItems((current) => sortItems([created, ...current]));
      emitOrderActivityRefresh(businessId, orderId);
      setTitle("");
      setNote("");
      setDueDate(getTodayDateOnly());
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create follow-up");
    } finally {
      setSaving(false);
    }
  }

  async function patchStatus(item: FollowUpListItem, status: FollowUpListItem["status"]) {
    setSaving(true);
    setErrorMessage(null);
    const previous = items;
    const optimistic: FollowUpListItem = {
      ...item,
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    setItems((current) => sortItems(current.map((entry) => (entry.id === item.id ? optimistic : entry))));

    try {
      const updated = (await updateFollowUpStatus({
        followUpId: item.id,
        businessSlug,
        status,
      })) as FollowUpListItem;

      setItems((current) => sortItems(current.map((entry) => (entry.id === item.id ? updated : entry))));
      emitOrderActivityRefresh(businessId, orderId);
      router.refresh();
    } catch (error) {
      setItems(previous);
      setErrorMessage(error instanceof Error ? error.message : "Failed to update follow-up");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(value: FollowUpCompletionValue) {
    if (!completeDialogItem) return;

    setSaving(true);
    setErrorMessage(null);
    const currentItem = completeDialogItem;
    const previous = items;
    const optimisticCompleted: FollowUpListItem = {
      ...currentItem,
      status: "done",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completion_note: value.completionNote,
      next_follow_up_id: null,
    };

    setItems((current) => sortItems(current.map((entry) => (entry.id === currentItem.id ? optimisticCompleted : entry))));

    try {
      const result = (await completeFollowUp({
        followUpId: currentItem.id,
        businessSlug,
        completionNote: value.completionNote,
        nextFollowUp: value.nextFollowUp,
      })) as { completed: FollowUpListItem; next: FollowUpListItem | null };

      setItems((current) =>
        sortItems([
          ...(result.next ? [result.next] : []),
          ...current
            .filter((entry) => entry.id !== currentItem.id && entry.id !== result.next?.id)
            .map((entry) => entry),
          result.completed,
        ]),
      );
      setCompleteDialogItem(null);
      emitOrderActivityRefresh(businessId, orderId);
      router.refresh();
    } catch (error) {
      setItems(previous);
      setErrorMessage(error instanceof Error ? error.message : "Failed to complete follow-up");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[20px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#ffffff_0%,#F9FAFB_100%)] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="product-section-title flex items-center gap-2">
              <span>Follow-up</span>
              <span className="text-xs font-semibold text-[#9CA3AF]">({openItems.length})</span>
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              Planned future actions for this order, separate from notes, activity, and checklist.
            </p>
          </div>
        </div>

        {canManage ? (
          <div className="rounded-[18px] border border-[#E6EBF2] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex flex-col gap-3">
              <Input
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
                placeholder="For example: call the client and confirm the time"
                className="h-11 rounded-[16px] border-[#E5E7EB] bg-[#F9FAFB] text-sm shadow-none focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/15"
              />

              <div className="flex flex-wrap items-center gap-2">
                <DueShortcutButton active={dueDate === getTodayDateOnly()} onClick={() => setDueDate(getTodayDateOnly())}>
                  Today
                </DueShortcutButton>
                <DueShortcutButton active={dueDate === getTomorrowDateOnly()} onClick={() => setDueDate(getTomorrowDateOnly())}>
                  Tomorrow
                </DueShortcutButton>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition",
                        dueDate !== getTodayDateOnly() && dueDate !== getTomorrowDateOnly()
                          ? "border-[#C7D2FE] bg-[#EEF2FF] text-[#3645A0]"
                          : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#D6DAE1] hover:text-[#374151]",
                      )}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      {dueDate !== getTodayDateOnly() && dueDate !== getTomorrowDateOnly()
                        ? formatFollowUpDate(dueDate)
                        : "Pick date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto rounded-[20px] border-[#E5E7EB] bg-white p-0 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
                    <Calendar
                      mode="single"
                      selected={selectedDate ?? undefined}
                      onSelect={(date) => {
                        if (!date) return;
                        setDueDate(formatDateOnlyForStorage(date));
                        setCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-xs font-medium text-[#9CA3AF]">{formatFollowUpDate(dueDate)}</span>
              </div>

              <Textarea
                value={note}
                onChange={(event) => setNote(event.currentTarget.value)}
                placeholder="Comment (optional)"
                className="min-h-[72px] rounded-[16px] border-[#E5E7EB] bg-[#F9FAFB] text-sm leading-6 text-[#1F2937] shadow-none focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/15"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                {errorMessage ? (
                  <div className="text-xs font-medium text-[#B42318]">{errorMessage}</div>
                ) : (
                  <div className="text-xs text-[#9CA3AF]">Capture the next action directly from the order context.</div>
                )}
                <Button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={!title.trim() || saving}
                  className="h-10 rounded-[16px] px-4 text-sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CirclePlus className="h-4 w-4" />}
                  Add
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[18px] border border-[#E5E7EB] bg-white px-4 py-8 text-sm text-[#6B7280] shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            Loading follow-ups...
          </div>
        ) : openItems.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#E5E7EB] bg-white/80 px-4 py-8 text-center">
            <div className="text-sm font-semibold text-[#1F2937]">No open follow-ups yet</div>
            <p className="mt-1 text-sm leading-6 text-[#6B7280]">
              Add the next action for this order so future commitments do not get lost in notes.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {openItems.map((item) => (
              <FollowUpItemRow
                key={item.id}
                item={item}
                canManage={canManage}
                onToggleDone={(current, done) => (done ? setCompleteDialogItem(current) : void patchStatus(current, "open"))}
                onReopen={(current) => void patchStatus(current, "open")}
              />
            ))}
          </div>
        )}

        {completedItems.length > 0 ? (
          <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
            <div className="rounded-[18px] border border-[#E5E7EB] bg-white/70 px-3.5 py-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
                <div>
                  <div className="text-sm font-semibold text-[#1F2937]">Completed and cancelled</div>
                  <div className="mt-1 text-xs text-[#9CA3AF]">{completedItems.length} items</div>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-[#6B7280] transition", completedOpen ? "rotate-180" : "")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2.5">
                {completedItems.map((item) => (
                  <FollowUpItemRow
                    key={item.id}
                    item={item}
                    canManage={canManage}
                    onToggleDone={(current, done) => (done ? setCompleteDialogItem(current) : void patchStatus(current, "open"))}
                    onReopen={(current) => void patchStatus(current, "open")}
                  />
                ))}
              </CollapsibleContent>
            </div>
          </Collapsible>
        ) : null}
      </div>

      <FollowUpCompleteDialog
        item={completeDialogItem}
        open={Boolean(completeDialogItem)}
        submitting={saving}
        onOpenChange={(open) => {
          if (!open) setCompleteDialogItem(null);
        }}
        onSubmit={(value) => void handleComplete(value)}
      />
    </div>
  );
}
