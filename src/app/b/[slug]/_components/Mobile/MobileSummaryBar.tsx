"use client";

import { useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp } from "lucide-react";

type Props = {
  cards: {
    label: string;
    value: string;
    trendText: string | null;
    trendDirection: "up" | "down" | "neutral";
    trendTone: "positive" | "negative" | "neutral";
    tone: "neutral" | "blue" | "green" | "red";
  }[];
  periodLabel: string;
  comparisonLabel: string | null;
  hasComparison: boolean;
  periodOptions: {
    label: string;
    shortLabel: string;
    href: string;
    active: boolean;
  }[];
  extendedOptions?: {
    label: string;
    shortLabel: string;
    href: string;
    active: boolean;
  }[];
  customRange?: {
    active: boolean;
    startDate: string | null;
    endDate: string | null;
    phoneRaw: string;
    tableQuery: {
      q: string;
      sort: string;
      statuses: string[];
      range: string;
      startDate: string | null;
      endDate: string | null;
      actor: string;
    };
  };
  storageKey?: string;
};

export default function MobileSummaryBar({
  cards,
  periodLabel,
  comparisonLabel,
  hasComparison,
  periodOptions,
  extendedOptions = [],
  customRange,
  storageKey = "orders-mobile-summary-hidden",
}: Props) {
  const hidden = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const eventName = `summary-visibility:${storageKey}`;
      const listener = () => onStoreChange();
      window.addEventListener(eventName, listener);
      return () => {
        window.removeEventListener(eventName, listener);
      };
    },
    () => {
      if (typeof window === "undefined") return false;
      try {
        return window.localStorage.getItem(storageKey) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );

  const setHidden = (nextHidden: boolean) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, nextHidden ? "1" : "0");
      window.dispatchEvent(new CustomEvent(`summary-visibility:${storageKey}`));
    } catch {
      // Ignore storage write failures.
    }
  };

  return (
    <section className="rounded-[24px] border border-[#dde3ee] bg-[#f8fafc]/92 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#667085]">
              Summary
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-medium text-[#98a2b3]">{periodLabel}</div>
            <button
              type="button"
              onClick={() => setHidden(!hidden)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#dde3ee] bg-white text-[#667085] transition hover:border-[#cfd8e6] hover:text-[#111827]"
              aria-label={hidden ? "Show summary" : "Hide summary"}
              title={hidden ? "Show summary" : "Hide summary"}
            >
              {hidden ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {hidden ? null : (
          <>
        <div className="mt-2 inline-flex rounded-full border border-[#dde3ee] bg-white p-1">
          {periodOptions.map((option) => (
            <a
              key={option.label}
              href={option.href}
              className={[
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                option.active
                  ? "bg-[#111827] text-white"
                  : "text-[#667085] hover:bg-[#f8fafc] hover:text-[#111827]",
              ].join(" ")}
            >
              {option.shortLabel}
            </a>
          ))}
        </div>

        {extendedOptions.length > 0 ? (
          <details className="mt-2 rounded-2xl border border-[#dde3ee] bg-white p-2">
            <summary className="cursor-pointer list-none text-[11px] font-semibold text-[#475467]">
              More analytics
            </summary>
            <div className="mt-2 grid gap-2">
              {extendedOptions.map((option) => (
                <a
                  key={option.label}
                  href={option.href}
                  className={[
                    "rounded-xl px-3 py-2 text-[12px] font-medium transition",
                    option.active
                      ? "bg-[#111827] text-white"
                      : "border border-[#dde3ee] text-[#475467]",
                  ].join(" ")}
                >
                  {option.label}
                </a>
              ))}
            </div>
          </details>
        ) : null}

        {customRange?.active ? (
          <form method="get" className="mt-2 grid gap-2 rounded-2xl border border-[#dde3ee] bg-white p-3">
            <input type="hidden" name="u" value={customRange.phoneRaw} />
            {customRange.tableQuery.q ? <input type="hidden" name="q" value={customRange.tableQuery.q} /> : null}
            {customRange.tableQuery.sort && customRange.tableQuery.sort !== "newest" ? (
              <input type="hidden" name="sort" value={customRange.tableQuery.sort} />
            ) : null}
            {customRange.tableQuery.statuses.map((status) => (
              <input key={status} type="hidden" name="status" value={status} />
            ))}
            {customRange.tableQuery.range !== "ALL" ? (
              <input type="hidden" name="range" value={customRange.tableQuery.range} />
            ) : null}
            {customRange.tableQuery.startDate ? (
              <input type="hidden" name="start" value={customRange.tableQuery.startDate} />
            ) : null}
            {customRange.tableQuery.endDate ? (
              <input type="hidden" name="end" value={customRange.tableQuery.endDate} />
            ) : null}
            {customRange.tableQuery.actor !== "ALL" ? (
              <input type="hidden" name="actor" value={customRange.tableQuery.actor} />
            ) : null}
            <input type="hidden" name="srange" value="custom" />
            <input
              type="date"
              name="sstart"
              defaultValue={customRange.startDate ?? ""}
              className="h-10 rounded-xl border border-[#dde3ee] px-3 text-sm outline-none focus:border-[#111827]"
            />
            <input
              type="date"
              name="send"
              defaultValue={customRange.endDate ?? ""}
              className="h-10 rounded-xl border border-[#dde3ee] px-3 text-sm outline-none focus:border-[#111827]"
            />
            <button
              type="submit"
              className="inline-flex h-10 min-w-[110px] items-center justify-center rounded-xl bg-[#111827] px-4 text-[12px] font-semibold text-white"
            >
              Apply range
            </button>
          </form>
        ) : null}

        <div className="-mx-1 mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
          {cards.map((card) => {
            const trendCls =
              card.trendTone === "positive"
                ? "text-[#067647]"
                : card.trendTone === "negative"
                  ? "text-[#b42318]"
                  : "text-[#98a2b3]";
            const valueCls = card.tone === "red" ? "text-[#d92d20]" : "text-[#111827]";
            const borderCls =
              card.tone === "red"
                ? "border-[#ffd5d2]"
                : "border-[#dde3ee]";
            const TrendIcon =
              card.trendDirection === "up"
                ? TrendingUp
                : card.trendDirection === "down"
                  ? TrendingDown
                  : null;

            return (
              <article
                key={card.label}
                className={`min-w-[148px] snap-start rounded-[20px] border bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${borderCls}`}
              >
                <div className="text-[11px] font-semibold text-[#667085]">{card.label}</div>
                <div className={`mt-2 text-xl font-bold tracking-[-0.03em] tabular-nums ${valueCls}`}>
                  {card.value}
                </div>
                <div className="mt-1 text-[11px] font-medium text-[#98a2b3]">{periodLabel}</div>
                {card.trendText ? (
                  <div className={`mt-2 inline-flex items-center gap-1 text-[11px] font-medium ${trendCls}`}>
                    {TrendIcon ? <TrendIcon className="h-3.5 w-3.5" /> : null}
                    <span>{card.trendText}</span>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="mt-2 text-[11px] font-medium text-[#98a2b3]">
          {hasComparison
            ? `${periodLabel} vs ${comparisonLabel ?? "previous period"}`
            : "All-time summary"}
        </div>
          </>
        )}
      </div>
    </section>
  );
}
