"use client";

import * as React from "react";
import { CheckCheck, Loader2, MoonStar, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { completeWorkDay } from "@/app/b/[slug]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FollowUpRow } from "@/lib/follow-ups";
import { createClient } from "@/lib/supabase/client";
import {
  getTodayDateOnly,
  getTomorrowDateOnly,
  startOfLocalDay,
} from "@/lib/follow-ups";
import type { WorkDayRow } from "@/lib/work-day";
import { emitWorkDayUpdated } from "./work-day-events";

type TomorrowItemDraft = {
  id: string;
  title: string;
};

type FollowUpSnapshot = Pick<
  FollowUpRow,
  "id" | "title" | "due_date" | "order_id" | "completed_at" | "created_by"
>;

function buildTomorrowItem(id?: string): TomorrowItemDraft {
  return {
    id: id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
  };
}

function formatWorkDayError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("public.work_days")) {
    return "Missing work_days table. Run the 20260319_create_work_days.sql migration.";
  }
  return message;
}

function armOverlayCloseGuard() {
  if (typeof window === "undefined") return;
  window.__ordersOverlayClosingUntil = Date.now() + 250;
}

export function EndOfDayDialog({
  businessId,
  businessSlug,
  canManage,
  triggerClassName,
  triggerLabel,
  compact = false,
  onComplete,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  businessId: string;
  businessSlug: string;
  canManage: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
  compact?: boolean;
  onComplete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [dailySummary, setDailySummary] = React.useState("");
  const [tomorrowItems, setTomorrowItems] = React.useState<TomorrowItemDraft[]>(
    [buildTomorrowItem("initial")],
  );
  const [existingWorkDay, setExistingWorkDay] =
    React.useState<WorkDayRow | null>(null);
  const [completedToday, setCompletedToday] = React.useState<
    FollowUpSnapshot[]
  >([]);
  const [existingTomorrowFollowUps, setExistingTomorrowFollowUps] =
    React.useState<FollowUpSnapshot[]>([]);
  const dailySummaryRef = React.useRef<HTMLTextAreaElement | null>(null);
  const open = controlledOpen ?? internalOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [controlledOpen, onOpenChange],
  );

  React.useEffect(() => {
    const node = dailySummaryRef.current;
    if (!node) return;

    const baseHeight = 96;
    const maxHeight = 240;
    node.style.height = "0px";
    const nextHeight = Math.min(
      Math.max(node.scrollHeight, baseHeight),
      maxHeight,
    );
    node.style.height = `${nextHeight}px`;
    node.style.overflowY = node.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [dailySummary, open]);

  React.useEffect(() => {
    if (!open || !canManage) return;

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    void (async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError) {
        setErrorMessage(formatWorkDayError(authError));
        setExistingWorkDay(null);
        setCompletedToday([]);
        setExistingTomorrowFollowUps([]);
        setIsLoading(false);
        return;
      }

      const todayDate = getTodayDateOnly();
      const tomorrowDate = getTomorrowDateOnly();
      const dayStart = startOfLocalDay();
      const tomorrowStart = new Date(dayStart.getTime());
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      const [
        { data: workDayData, error: workDayError },
        { data: completedData, error: completedError },
        { data: tomorrowData, error: tomorrowError },
      ] = await Promise.all([
        supabase
          .from("work_days")
          .select("*")
          .eq("business_id", businessId)
          .eq("user_id", user?.id ?? "")
          .eq("work_date", todayDate)
          .maybeSingle(),
        supabase
          .from("follow_ups")
          .select("id, title, due_date, order_id, completed_at, created_by")
          .eq("business_id", businessId)
          .eq("created_by", user?.id ?? "")
          .eq("status", "done")
          .gte("completed_at", dayStart.toISOString())
          .lt("completed_at", tomorrowStart.toISOString())
          .order("completed_at", { ascending: false }),
        supabase
          .from("follow_ups")
          .select("id, title, due_date, order_id, completed_at, created_by")
          .eq("business_id", businessId)
          .eq("created_by", user?.id ?? "")
          .eq("status", "open")
          .eq("due_date", tomorrowDate)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      const nextError = workDayError ?? completedError ?? tomorrowError;
      if (nextError) {
        setErrorMessage(formatWorkDayError(nextError));
        setExistingWorkDay(null);
        setCompletedToday([]);
        setExistingTomorrowFollowUps([]);
        setIsLoading(false);
        return;
      }

      const row = (workDayData ?? null) as WorkDayRow | null;
      const completedItems = (completedData ?? []) as FollowUpSnapshot[];
      const tomorrowFollowUps = (tomorrowData ?? []) as FollowUpSnapshot[];

      setExistingWorkDay(row);
      setCompletedToday(completedItems);
      setExistingTomorrowFollowUps(tomorrowFollowUps);
      setDailySummary(row?.daily_summary?.trim() || "");
      setTomorrowItems([buildTomorrowItem("initial")]);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId, canManage, open, supabase]);

  if (!canManage) return null;

  const nonEmptyTomorrowItems = tomorrowItems
    .map((item) => item.title.trim())
    .filter(Boolean);

  async function handleSubmit() {
    const trimmedSummary = dailySummary.trim();
    if (!trimmedSummary || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await completeWorkDay({
        businessId,
        businessSlug,
        dailySummary: trimmedSummary,
        tomorrowItems: nonEmptyTomorrowItems.map((title) => ({ title })),
      });

      armOverlayCloseGuard();
      setOpen(false);
      setExistingWorkDay(null);
      setDailySummary("");
      setTomorrowItems([buildTomorrowItem("initial")]);
      emitWorkDayUpdated();
      onComplete?.();
      router.refresh();
    } catch (error) {
      setErrorMessage(
        formatWorkDayError(error) || "Failed to complete work day",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) armOverlayCloseGuard();
        setOpen(nextOpen);
      }}
    >
      {!hideTrigger ? (
        <DialogTrigger asChild>
          <button
            type="button"
            className={
              triggerClassName ??
              (compact
                ? "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
                : "inline-flex h-10 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#374151] shadow-sm transition hover:border-[#C7D2FE] hover:text-[#1F2937]")
            }
          >
            <MoonStar
              className={compact ? "h-4 w-4 text-gray-500" : "mr-2 h-4 w-4"}
            />
            <span>{triggerLabel ?? "End day"}</span>
          </button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-[680px] flex-col overflow-hidden rounded-[28px] border-[#E5E7EB] bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <div className="flex min-h-0 flex-1 flex-col rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#F9FAFB_100%)]">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-7 sm:py-7">
            <DialogHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-[22px] tracking-[-0.02em] text-[#111827]">
                    End day
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm leading-6 text-[#6B7280]">
                    Wrap up today, save a concise summary, and add any missing
                    actions for tomorrow as follow-ups.
                  </DialogDescription>
                </div>
                {existingWorkDay?.status === "finished" ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#D1FADF] bg-[#ECFDF3] px-3 py-1.5 text-xs font-semibold text-[#067647]">
                    <CheckCheck className="h-3.5 w-3.5" />
                    Already finished today
                  </span>
                ) : null}
              </div>
            </DialogHeader>

            <div className="mt-6 space-y-5">
              {isLoading ? (
                <div className="rounded-[20px] border border-[#E5E7EB] bg-white px-4 py-8 text-sm text-[#6B7280]">
                  Loading today&apos;s work day...
                </div>
              ) : (
                <>
                  <section className="rounded-[22px] border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                    <div className="text-sm font-semibold text-[#1F2937]">
                      What did you get done today?
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                      Completed follow-ups are pulled in as a draft. Edit the
                      summary and add any manual context you want to keep for
                      the future work day tracker.
                    </p>
                    {completedToday.length > 0 ? (
                      <div className="mt-3 rounded-[18px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                          Auto-captured from completed follow-ups
                        </div>
                        <div className="mt-2 space-y-2">
                          {completedToday.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-[14px] border border-white bg-white px-3 py-2 text-sm text-[#374151] shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
                            >
                              {item.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <Textarea
                      ref={dailySummaryRef}
                      value={dailySummary}
                      onChange={(event) =>
                        setDailySummary(event.currentTarget.value)
                      }
                      placeholder="Summarize completed work, decisions, blockers cleared, and outcomes."
                      className="mt-3 min-h-[96px] rounded-[18px] border-[#E5E7EB] bg-[#F9FAFB] text-sm leading-6 text-[#1F2937] shadow-none focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15"
                    />
                  </section>

                  <section className="rounded-[22px] border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[#1F2937]">
                          What should happen tomorrow?
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                          Existing tomorrow follow-ups are shown first. Only the
                          new items you type below will create additional
                          follow-ups due tomorrow.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-[14px] border-[#E5E7EB] bg-white px-3 text-xs text-[#374151] hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
                        onClick={() =>
                          setTomorrowItems((current) => [
                            ...current,
                            buildTomorrowItem(),
                          ])
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Add item
                      </Button>
                    </div>

                    {existingTomorrowFollowUps.length > 0 ? (
                      <div className="mt-4 rounded-[18px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                          Already scheduled for tomorrow
                        </div>
                        <div className="mt-2 space-y-2">
                          {existingTomorrowFollowUps.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 rounded-[14px] border border-white bg-white px-3 py-2 text-sm text-[#374151] shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
                            >
                              <span className="inline-flex h-2 w-2 rounded-full bg-[var(--brand-600)]" />
                              <span>{item.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 space-y-3">
                      {tomorrowItems.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#F9FAFB] text-xs font-semibold text-[#6B7280]">
                            {index + 1}
                          </span>
                          <Input
                            value={item.title}
                            onChange={(event) =>
                              setTomorrowItems((current) =>
                                current.map((entry) =>
                                  entry.id === item.id
                                    ? {
                                        ...entry,
                                        title: event.currentTarget.value,
                                      }
                                    : entry,
                                ),
                              )
                            }
                            placeholder="Add a follow-up for tomorrow"
                            className="h-10 rounded-[14px] border-[#E5E7EB] bg-[#F9FAFB] text-sm shadow-none focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15"
                          />
                          <button
                            type="button"
                            disabled={tomorrowItems.length === 1}
                            onClick={() =>
                              setTomorrowItems((current) =>
                                current.length === 1
                                  ? current
                                  : current.filter(
                                      (entry) => entry.id !== item.id,
                                    ),
                              )
                            }
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#FECACA] hover:text-[#B42318] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Remove tomorrow item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {errorMessage ? (
                <div className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B42318]">
                  {errorMessage}
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="border-t border-[#E5E7EB] px-6 py-4 sm:px-7">
            <Button
              type="button"
              variant="outline"
              className="rounded-[16px] border-[#E5E7EB] bg-white text-[#374151] hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
              onClick={() => {
                armOverlayCloseGuard();
                setOpen(false);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-[16px]"
              onClick={() => void handleSubmit()}
              disabled={isLoading || isSaving || !dailySummary.trim()}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save and finish day
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
