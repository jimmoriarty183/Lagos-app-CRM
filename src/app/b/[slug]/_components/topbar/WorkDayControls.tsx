"use client";

import * as React from "react";
import {
  ChevronDown,
  Clock3,
  Loader2,
  MoonStar,
  Pause,
  Play,
} from "lucide-react";

import {
  pauseWorkDay,
  resumeWorkDay,
  startWorkDay,
} from "@/app/b/[slug]/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getTodayDateOnly } from "@/lib/follow-ups";
import { createClient } from "@/lib/supabase/client";
import type { WorkDayRow, WorkDayStatus } from "@/lib/work-day";
import { EndOfDayDialog } from "./EndOfDayDialog";
import { emitWorkDayUpdated, WORK_DAY_UPDATED_EVENT } from "./work-day-events";

function normalizeStatus(value: string | null | undefined): WorkDayStatus {
  if (value === "running" || value === "paused" || value === "finished")
    return value;
  return "draft";
}

function formatWorkDayError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("public.work_days")) {
    return "Run the work_days migration to enable day tracking.";
  }
  return message;
}

function compactActionClass(
  tone: "default" | "warning" | "success" | "neutral",
) {
  if (tone === "warning") {
    return "h-9 justify-start rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 text-sm font-semibold text-[#B54708] shadow-none hover:border-[#FCD34D] hover:bg-[#FEF3C7] disabled:opacity-100";
  }
  if (tone === "success") {
    return "h-9 justify-start rounded-lg border border-[#D1FADF] bg-[#ECFDF3] px-3 text-sm font-semibold text-[#067647] shadow-none hover:border-[#A6F4C5] hover:bg-[#DCFCE7] disabled:opacity-100";
  }
  if (tone === "neutral") {
    return "h-9 justify-start rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#374151] shadow-none hover:border-[#D6DAE1] hover:bg-[#FCFCFD] disabled:opacity-100";
  }
  return "h-9 justify-start rounded-lg border border-[#6366F1] bg-[#6366F1] px-3 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.10)] hover:border-[#5558E3] hover:bg-[#5558E3] disabled:opacity-100";
}

function desktopActionClass(
  tone: "primary" | "warning" | "success" | "neutral",
) {
  if (tone === "primary") {
    return "inline-flex h-8 items-center rounded-lg border border-[#6366F1] bg-[#6366F1] px-3 text-[12px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.10)] transition hover:border-[#5558E3] hover:bg-[#5558E3] disabled:opacity-100";
  }
  if (tone === "warning") {
    return "inline-flex h-8 items-center rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 text-[12px] font-semibold text-[#B54708] shadow-sm transition hover:border-[#FCD34D] hover:bg-[#FEF3C7] disabled:opacity-100";
  }
  if (tone === "success") {
    return "inline-flex h-8 items-center rounded-lg border border-[#D1FADF] bg-[#ECFDF3] px-3 text-[12px] font-semibold text-[#067647] shadow-sm transition hover:border-[#A6F4C5] hover:bg-[#D1FADF] disabled:opacity-100";
  }
  return "inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#374151] shadow-sm transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD] disabled:opacity-100";
}

function formatElapsedTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function getElapsedWorkSeconds(workDay: WorkDayRow | null, nowMs: number) {
  if (!workDay?.started_at) return 0;

  const startedAtMs = Date.parse(workDay.started_at);
  if (!Number.isFinite(startedAtMs)) return 0;

  let boundaryMs = nowMs;
  if (workDay.status === "paused" && workDay.paused_at) {
    const pausedAtMs = Date.parse(workDay.paused_at);
    if (Number.isFinite(pausedAtMs)) boundaryMs = pausedAtMs;
  } else if (workDay.status === "finished" && workDay.finished_at) {
    const finishedAtMs = Date.parse(workDay.finished_at);
    if (Number.isFinite(finishedAtMs)) boundaryMs = finishedAtMs;
  }

  return Math.max(
    0,
    Math.floor((boundaryMs - startedAtMs) / 1000) -
      Math.max(0, Number(workDay.total_pause_seconds ?? 0)),
  );
}

export function WorkDayControls({
  businessId,
  businessSlug,
  canManage,
  compact = false,
  onActionComplete,
}: {
  businessId: string;
  businessSlug: string;
  canManage: boolean;
  compact?: boolean;
  onActionComplete?: () => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [workDay, setWorkDay] = React.useState<WorkDayRow | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [endDayOpen, setEndDayOpen] = React.useState(false);

  const loadWorkDay = React.useCallback(async () => {
    if (!canManage) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8000);
      const { data, error } = await supabase
        .from("work_days")
        .select("*")
        .eq("business_id", businessId)
        .eq("work_date", getTodayDateOnly())
        .abortSignal(controller.signal)
        .maybeSingle();
      window.clearTimeout(timeoutId);

      if (error) {
        setErrorMessage(formatWorkDayError(error));
        setWorkDay(null);
        return;
      }

      setWorkDay((data ?? null) as WorkDayRow | null);
    } catch (error) {
      setErrorMessage(formatWorkDayError(error));
      setWorkDay(null);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, canManage, supabase]);

  React.useEffect(() => {
    void loadWorkDay();
  }, [loadWorkDay]);

  React.useEffect(() => {
    const handleWorkDayUpdated = () => {
      void loadWorkDay();
    };

    window.addEventListener(WORK_DAY_UPDATED_EVENT, handleWorkDayUpdated);
    return () =>
      window.removeEventListener(WORK_DAY_UPDATED_EVENT, handleWorkDayUpdated);
  }, [loadWorkDay]);

  React.useEffect(() => {
    if (normalizeStatus(workDay?.status) !== "running") return;

    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [workDay?.status]);

  async function handleAction(action: "start" | "pause" | "resume") {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (action === "start") {
        await startWorkDay({ businessId, businessSlug });
      } else if (action === "pause") {
        await pauseWorkDay({ businessId, businessSlug });
      } else {
        await resumeWorkDay({ businessId, businessSlug });
      }

      await loadWorkDay();
      emitWorkDayUpdated();
      onActionComplete?.();
    } catch (error) {
      setErrorMessage(formatWorkDayError(error) || "Failed to update work day");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canManage) return null;

  const status = normalizeStatus(workDay?.status);
  const buttonIcon =
    isLoading || isSubmitting ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : null;
  const isActive = status === "running";
  const isPaused = status === "paused";
  const showEndDay = isActive || isPaused;
  const showStart = status === "draft" || status === "finished";
  const showTimer = isActive || isPaused;
  const elapsedLabel = formatElapsedTime(getElapsedWorkSeconds(workDay, nowMs));

  if (compact) {
    return (
      <div className="space-y-2">
        {showTimer ? (
          <div className="inline-flex h-9 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#374151] shadow-none">
            <Clock3 className="h-4 w-4" />
            <span className="ml-2 font-semibold tabular-nums">
              {elapsedLabel}
            </span>
          </div>
        ) : null}
        {showStart ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading || isSubmitting}
            onClick={() => void handleAction("start")}
            onTouchEnd={(e) => {
              // Prevent ghost clicks and ensure touch devices respond
              e.preventDefault();
              if (!isLoading && !isSubmitting) {
                void handleAction("start");
              }
            }}
            className={compactActionClass("default")}
          >
            {buttonIcon ?? <Play className="h-4 w-4" />}
            <span className="ml-2">
              {isLoading ? "Loading day..." : "Start day"}
            </span>
          </Button>
        ) : null}
        {isActive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading || isSubmitting}
            onClick={() => void handleAction("pause")}
            className={compactActionClass("warning")}
          >
            {buttonIcon ?? <Pause className="h-4 w-4" />}
            <span className="ml-2">Pause day</span>
          </Button>
        ) : null}
        {isPaused ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading || isSubmitting}
            onClick={() => void handleAction("resume")}
            className={compactActionClass("success")}
          >
            {buttonIcon ?? <Play className="h-4 w-4" />}
            <span className="ml-2">Resume day</span>
          </Button>
        ) : null}
        {showEndDay ? (
          <EndOfDayDialog
            businessId={businessId}
            businessSlug={businessSlug}
            canManage={canManage}
            compact
            onComplete={onActionComplete}
          />
        ) : null}
        {errorMessage ? (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs font-medium text-[#B54708]">
            {errorMessage}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <EndOfDayDialog
        businessId={businessId}
        businessSlug={businessSlug}
        canManage={canManage}
        open={endDayOpen}
        onOpenChange={setEndDayOpen}
        onComplete={() => {
          setEndDayOpen(false);
          onActionComplete?.();
        }}
        hideTrigger
      />
      {showTimer ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={[
                "inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-semibold shadow-sm transition",
                isPaused
                  ? "border-[#FDE68A] bg-[#FFFBEB] text-[#B54708] hover:border-[#FCD34D] hover:bg-[#FEF3C7]"
                  : "border-[#C7D2FE] bg-[#EEF2FF] text-[#3645A0] hover:border-[#A5B4FC] hover:bg-[#E0E7FF]",
              ].join(" ")}
            >
              <Clock3 className="h-4 w-4" />
              <span className="ml-2 tabular-nums">{elapsedLabel}</span>
              <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="w-[190px] rounded-xl border-[#E5E7EB] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
          >
            {isActive ? (
              <DropdownMenuItem
                onClick={() => void handleAction("pause")}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#374151]"
              >
                <Pause className="h-4 w-4 text-[#B54708]" />
                Pause day
              </DropdownMenuItem>
            ) : null}
            {isPaused ? (
              <DropdownMenuItem
                onClick={() => void handleAction("resume")}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#374151]"
              >
                <Play className="h-4 w-4 text-[#067647]" />
                Resume day
              </DropdownMenuItem>
            ) : null}
            {showEndDay ? (
              <DropdownMenuItem
                onClick={() => setEndDayOpen(true)}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#374151]"
              >
                <MoonStar className="h-4 w-4 text-[#6B7280]" />
                End day
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {showStart ? (
        <Button
          type="button"
          variant="outline"
          size="default"
          disabled={isLoading || isSubmitting}
          onClick={() => void handleAction("start")}
          onTouchEnd={(e) => {
            // Prevent ghost clicks and ensure touch devices respond
            e.preventDefault();
            if (!isLoading && !isSubmitting) {
              void handleAction("start");
            }
          }}
          className={desktopActionClass("primary")}
        >
          {buttonIcon ?? <Play className="h-4 w-4" />}
          <span className="ml-2">
            {isLoading ? "Loading day..." : "Start day"}
          </span>
        </Button>
      ) : null}
      {errorMessage ? (
        <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[12px] font-medium text-[#B54708] shadow-sm">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
