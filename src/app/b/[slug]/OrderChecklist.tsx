"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CalendarDays,
  CheckCircle2,
  CirclePlus,
  Clock3,
  Trash2,
} from "lucide-react";
import { emitOrderActivityRefresh } from "@/app/b/[slug]/_components/orders/order-activity";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ChecklistItem = {
  id: string;
  business_id: string;
  order_id: string;
  title: string;
  is_done: boolean;
  created_at: string;
  done_at: string | null;
  due_date?: string | null;
};

const MONTH_INDEX_BY_NAME: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function formatShortDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function parseDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return buildSafeDate(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
}

function formatDueDate(value: string | Date | null | undefined) {
  const parsed = value instanceof Date ? value : parseDateOnly(value);
  if (!parsed) return null;
  const now = new Date();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(parsed.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(parsed);
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildSafeDate(year: number, monthIndex: number, day: number) {
  const candidate = new Date(year, monthIndex, day);
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== monthIndex ||
    candidate.getDate() !== day
  ) {
    return null;
  }
  return candidate;
}

function extractDueDate(title: string, createdAt: string) {
  const normalized = title.trim().toLowerCase();
  const createdDate = new Date(createdAt);
  const fallbackYear = Number.isNaN(createdDate.getTime())
    ? new Date().getFullYear()
    : createdDate.getFullYear();

  const isoMatch = normalized.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const candidate = buildSafeDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
    );
    if (candidate) return candidate;
  }

  const numericMatch = normalized.match(
    /\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/,
  );
  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const monthIndex = Number(numericMatch[2]) - 1;
    const rawYear = numericMatch[3];
    const year =
      rawYear == null
        ? fallbackYear
        : rawYear.length === 2
          ? 2000 + Number(rawYear)
          : Number(rawYear);
    const candidate = buildSafeDate(year, monthIndex, day);
    if (candidate) return candidate;
  }

  const namedMonthMatch = normalized.match(
    /\b(?:due\s+)?(?:(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:,\s*(\d{4}))?|(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)(?:\s+(\d{4}))?)\b/,
  );
  if (namedMonthMatch) {
    const monthName = namedMonthMatch[1] ?? namedMonthMatch[5];
    const day = Number(namedMonthMatch[2] ?? namedMonthMatch[4]);
    const year = Number(
      namedMonthMatch[3] ?? namedMonthMatch[6] ?? fallbackYear,
    );
    const monthIndex = MONTH_INDEX_BY_NAME[monthName];
    const candidate = buildSafeDate(year, monthIndex, day);
    if (candidate) return candidate;
  }

  return null;
}

function isMissingColumnError(error: unknown, column: string) {
  const message = String(
    (error as { message?: string } | null)?.message ?? "",
  ).toLowerCase();
  return (
    message.includes(`could not find the '${column.toLowerCase()}' column`) &&
    message.includes("schema cache")
  );
}

function formatErrorDetails(error: unknown) {
  if (!error) return "Unknown error";
  if (error instanceof Error) return `${error.name}: ${error.message}`;

  const candidate = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
  };

  const parts = [
    candidate.message ? `message=${String(candidate.message)}` : null,
    candidate.details ? `details=${String(candidate.details)}` : null,
    candidate.hint ? `hint=${String(candidate.hint)}` : null,
    candidate.code ? `code=${String(candidate.code)}` : null,
  ].filter(Boolean);

  return parts.join(" | ") || JSON.stringify(error);
}

export function OrderChecklist({
  order,
  supabase,
}: {
  order: { id: string; business_id: string };
  supabase: SupabaseClient;
}) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completedCount = items.filter((item) => item.is_done).length;
  const pendingCount = items.length - completedCount;
  const progress =
    items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("order_checklist_items")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (!cancelled) setItems((data as ChecklistItem[]) || []);
      if (error) console.error(error);
    })();

    return () => {
      cancelled = true;
    };
  }, [order.id, supabase]);

  const add = async () => {
    const t = title.trim();
    if (!t || loading) return;

    setLoading(true);
    setErrorMessage(null);
    const requestedDueDate = dueDate || null;
    const insertPayload = {
      order_id: order.id,
      business_id: order.business_id,
      title: t,
      due_date: requestedDueDate,
    };

    let { data, error } = await supabase
      .from("order_checklist_items")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error && isMissingColumnError(error, "due_date")) {
      const retry = await supabase
        .from("order_checklist_items")
        .insert({
          order_id: order.id,
          business_id: order.business_id,
          title: t,
        })
        .select("*")
        .single();

      data = retry.data;
      error = retry.error;
    }

    if (error) {
      const details = formatErrorDetails(error);
      console.error("Failed to add checklist item:", details, error);
      setErrorMessage(details);
      setLoading(false);
      return;
    }

    const nextItem = {
      ...(data as ChecklistItem),
      // Keep the chosen date visible even if the backend had to fall back
      // because the `due_date` column is not yet available in schema cache.
      due_date: (data as ChecklistItem | null)?.due_date ?? requestedDueDate,
    } as ChecklistItem;

    setItems((prev) => [...prev, nextItem]);
    setTitle("");
    setDueDate("");
    setErrorMessage(null);
    emitOrderActivityRefresh(order.business_id, order.id);
    setLoading(false);
  };

  const toggle = async (item: ChecklistItem) => {
    if (loading) return;

    const nextDone = !item.is_done;
    const patch = {
      is_done: nextDone,
      done_at: nextDone ? new Date().toISOString() : null,
    };

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)),
    );

    const { error } = await supabase
      .from("order_checklist_items")
      .update(patch)
      .eq("id", item.id);

    if (error) {
      const details = formatErrorDetails(error);
      console.error("Failed to update checklist item:", details, error);
      setErrorMessage(details);
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
      return;
    }

    setErrorMessage(null);
    emitOrderActivityRefresh(order.business_id, order.id);
  };

  const remove = async (item: ChecklistItem) => {
    if (loading) return;

    const ok = confirm("Delete this checklist item?");
    if (!ok) return;

    setLoading(true);

    const prevItems = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    const { error } = await supabase
      .from("order_checklist_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      const details = formatErrorDetails(error);
      console.error("Failed to delete checklist item:", details, error);
      setErrorMessage(details);
      setItems(prevItems);
      setLoading(false);
      return;
    }

    setErrorMessage(null);
    emitOrderActivityRefresh(order.business_id, order.id);
    setLoading(false);
  };

  return (
    <div className="rounded-[20px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
      <div className="space-y-2.5">
        <div>
          <div className="product-section-title">
            Checklist{" "}
            <span className="text-xs font-semibold text-[#9CA3AF] dark:text-white/40">
              ({items.length})
            </span>
          </div>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-white/55">
            Track the next action and deadline for this order.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] dark:bg-[var(--brand-600)]/15 px-3 py-1 text-[#374151]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#1F2937] dark:text-white/90" />
            {completedCount} done
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F9FAFB] dark:bg-white/[0.04] px-3 py-1 text-[#6B7280] dark:text-white/55">
            <Clock3 className="h-3.5 w-3.5 text-[#6B7280] dark:text-white/55" />
            {pendingCount} open
          </span>
          {loading ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7ed] px-3 py-1 text-[#b54708]">
              Saving changes...
            </span>
          ) : null}
        </div>
      </div>

      <div className="-mx-1 rounded-[24px] bg-[#F8FAFC] dark:bg-white/[0.03] px-1 pb-3 pt-3">
        <div className="rounded-[18px] border border-[#E5E7EB] dark:border-white/10 bg-white/95 dark:bg-white/[0.05] px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_10px_24px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="product-section-label">Checklist progress</div>
              <p className="mt-1 text-sm text-[#6B7280] dark:text-white/55">
                {items.length === 0
                  ? "Start with the first follow-up or delivery step."
                  : completedCount === items.length
                    ? "Everything in this checklist is complete."
                    : `${pendingCount} item${pendingCount === 1 ? "" : "s"} still need attention.`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-base font-semibold text-[#1F2937] dark:text-white/90">
                {progress}%
              </div>
              <div className="text-xs text-[#9CA3AF] dark:text-white/40">
                {completedCount}/{items.length || 0} done
              </div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef2f6] dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--brand-600)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {items.map((item) => {
          const resolvedDueDate =
            item.due_date ??
            extractDueDate(item.title, item.created_at)
              ?.toISOString()
              .slice(0, 10) ??
            null;
          const dueDateValue = parseDateOnly(resolvedDueDate);
          const isOverdue =
            !!dueDateValue &&
            !item.is_done &&
            new Date(
              dueDateValue.getFullYear(),
              dueDateValue.getMonth(),
              dueDateValue.getDate(),
            ).getTime() <
              new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                new Date().getDate(),
              ).getTime();

          return (
            <div
              key={item.id}
              className={[
                "group flex flex-col gap-2.5 rounded-[22px] border px-4 py-3.5 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition sm:flex-row sm:items-start sm:justify-between",
                item.is_done
                  ? "border-[#dbe5dc] dark:border-emerald-500/30 bg-[#f6fbf7] dark:bg-emerald-500/[0.08]"
                  : "border-[#e8edf3] dark:border-white/10 bg-white dark:bg-white/[0.04] hover:border-[#d5dce6] dark:hover:border-white/20 hover:bg-[#fcfdff] dark:hover:bg-white/[0.07]",
              ].join(" ")}
            >
              <label className="flex min-w-0 flex-1 items-start gap-3 text-[#1F2937] dark:text-white/90">
                <input
                  type="checkbox"
                  checked={!!item.is_done}
                  onChange={() => toggle(item)}
                  className="mt-1 h-4 w-4 rounded border-[var(--brand-200)] text-[var(--brand-600)] focus:ring-0"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={[
                      "block text-[15px] font-medium",
                      item.is_done
                        ? "text-[#9CA3AF] dark:text-white/40 line-through"
                        : "text-[#374151] dark:text-white/85",
                    ].join(" ")}
                  >
                    {item.title}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9CA3AF] dark:text-white/40">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Added {formatShortDate(item.created_at)}
                    </span>
                    {resolvedDueDate ? (
                      <span
                        className={[
                          "inline-flex items-center gap-1.5",
                          item.is_done
                            ? "text-[#9CA3AF] dark:text-white/40"
                            : isOverdue
                              ? "text-[#d92d20]"
                              : "text-[#374151]",
                        ].join(" ")}
                      >
                        <Clock3 className="h-3.5 w-3.5" />
                        Due {formatDueDate(resolvedDueDate)}
                      </span>
                    ) : null}
                    {item.done_at ? (
                      <span className="inline-flex items-center gap-1.5 text-[#12b76a]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed {formatDateTime(item.done_at)}
                      </span>
                    ) : null}
                  </span>
                </span>
              </label>

              <button
                type="button"
                onClick={() => remove(item)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-full border border-transparent text-[#9CA3AF] dark:text-white/40 transition hover:border-[#f3d1cd] hover:bg-[#fff1f3] hover:text-[#d92d20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]/15 sm:self-auto"
                title="Delete"
                aria-label="Delete checklist item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        {items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[#d8dee8] dark:border-white/15 bg-white dark:bg-white/[0.03] px-5 py-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F9FAFB] dark:bg-white/[0.04] text-[#6B7280] dark:text-white/55">
              <CirclePlus className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-[#1F2937] dark:text-white/90">
              No checklist yet
            </div>
            <p className="mt-1 text-xs leading-5 text-[#9CA3AF] dark:text-white/40">
              Add the first step, follow-up, or deadline so the workflow stays
              structured.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-[20px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add checklist item..."
            className="h-11 min-w-0 flex-1 rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-4 text-sm text-[#1F2937] dark:text-white/90 outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--brand-600)] focus:bg-white dark:focus:bg-white/[0.07] focus:ring-2 focus:ring-[var(--brand-600)]/15"
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Checklist due date"
                className="inline-flex h-11 min-w-0 items-center gap-2 rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-4 text-sm text-[#1F2937] dark:text-white/90 outline-none transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-white dark:hover:bg-white/[0.07] focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15 sm:w-[160px]"
              >
                <CalendarDays className="h-4 w-4 text-[#6B7280] dark:text-white/55" />
                <span className={dueDate ? "" : "text-[#9CA3AF] dark:text-white/40"}>
                  {dueDate ? formatDueDate(dueDate) : "Pick date"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0E0E1B] p-0 shadow-lg dark:shadow-[0_16px_36px_rgba(0,0,0,0.55)]"
              align="start"
            >
              <Calendar
                mode="single"
                selected={dueDate ? new Date(`${dueDate}T00:00:00`) : undefined}
                onSelect={(date) => {
                  if (!date) {
                    setDueDate("");
                    return;
                  }
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                  const dd = String(date.getDate()).padStart(2, "0");
                  setDueDate(`${yyyy}-${mm}-${dd}`);
                }}
              />
              {dueDate ? (
                <div className="border-t border-[#F3F4F6] dark:border-white/10 p-2">
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="w-full rounded-lg px-3 py-1.5 text-xs font-semibold text-[#6B7280] dark:text-white/55 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06] hover:text-[#1F2937] dark:hover:text-white"
                  >
                    Clear date
                  </button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={add}
            disabled={loading || !title.trim()}
            aria-disabled={loading || !title.trim()}
            className={[
              "inline-flex h-11 w-full min-w-0 shrink-0 items-center justify-center gap-2 rounded-[18px] border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]/15 sm:w-auto sm:min-w-[132px]",
              !title.trim() || loading
                ? "cursor-not-allowed border-[#E5E7EB] dark:border-white/10 bg-[#F3F4F6] dark:bg-white/[0.04] text-[#9CA3AF] dark:text-white/35"
                : "border-[var(--brand-200)] dark:border-[var(--brand-500)]/40 bg-[var(--brand-600)] dark:bg-[var(--brand-600)] text-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:bg-[var(--brand-700)] dark:hover:bg-[var(--brand-700)]",
            ].join(" ")}
          >
            <CirclePlus className="h-4 w-4" />
            {loading ? "Saving..." : "Add item"}
          </button>
        </div>
        <p className="mt-1.5 px-1 text-xs text-[#9CA3AF] dark:text-white/40">
          Set a deadline in the date field. Older items can still show a date if
          it was written in the text.
        </p>
        {errorMessage ? (
          <div className="mt-2 rounded-2xl border border-[#fecdca] dark:border-rose-500/30 bg-[#fff6f5] dark:bg-rose-500/10 px-3 py-2 text-xs leading-5 text-[#b42318] dark:text-rose-200">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
