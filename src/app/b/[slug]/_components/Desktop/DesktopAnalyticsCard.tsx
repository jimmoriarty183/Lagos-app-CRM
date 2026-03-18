import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  Package2,
  PlayCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

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
  hasOrdersEver: boolean;
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
    resetHref: string;
    quickOptions: {
      label: string;
      shortLabel: string;
      href: string;
      active: boolean;
    }[];
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
};

type MetricTone = "neutral" | "blue" | "green" | "red";

function SummaryCard({
  label,
  value,
  periodLabel,
  hasOrdersEver,
  trendText,
  trendDirection,
  trendTone,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  periodLabel: string;
  hasOrdersEver: boolean;
  trendText: string | null;
  trendDirection: "up" | "down" | "neutral";
  trendTone: "positive" | "negative" | "neutral";
  tone?: MetricTone;
  icon: ReactNode;
}) {
  const numericValue = Number(String(value).replace(/[^0-9.-]/g, ""));
  const isZeroState = Number.isFinite(numericValue) && numericValue === 0;
  const normalizedPeriodLabel = periodLabel.toLowerCase();
  const emptyStateCopy = !hasOrdersEver
    ? label === "Total Orders"
      ? "Add your first deal to start building a structured pipeline."
      : "Data will appear here once the team starts working in the system."
    : label === "Total Orders"
      ? `No deals in ${normalizedPeriodLabel} yet.`
      : label === "Total Revenue"
        ? `Revenue will appear in ${normalizedPeriodLabel} once work starts moving.`
        : label === "Active Orders"
          ? `No active deals in ${normalizedPeriodLabel} right now.`
          : `No overdue deals in ${normalizedPeriodLabel}.`;
  const toneClasses =
    tone === "blue"
      ? {
          iconWrap: "bg-[#eef4ff] text-[#2459d3]",
          value: "text-[#1F2937]",
          meta: "text-[#6B7280]",
        }
      : tone === "green"
        ? {
            iconWrap: "bg-[#ecfdf3] text-[#067647]",
            value: "text-[#1F2937]",
            meta: "text-[#6B7280]",
          }
        : tone === "red"
          ? {
              iconWrap: "bg-[#fef3f2] text-[#d92d20]",
              value: "text-[#d92d20]",
              meta: "text-[#b42318]",
          }
        : {
            iconWrap: "bg-[#f2f4f7] text-[#6B7280]",
            value: "text-[#1F2937]",
            meta: "text-[#6B7280]",
          };

  const trendClasses =
    trendTone === "positive"
      ? "text-[#067647]"
      : trendTone === "negative"
        ? "text-[#b42318]"
        : "text-[#9CA3AF]";

  const TrendIcon =
    trendDirection === "up"
      ? TrendingUp
      : trendDirection === "down"
        ? TrendingDown
        : null;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-medium text-[#6B7280]">
          {label}
        </div>
        <div
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneClasses.iconWrap}`}
        >
          {icon}
        </div>
      </div>

      {isZeroState ? (
        <div className="mt-5 max-w-[18rem] text-[13px] font-medium leading-5 text-[#6B7280]">
          {emptyStateCopy}
        </div>
      ) : (
        <>
          <div className={`mt-4 text-[24px] font-semibold leading-none tabular-nums sm:text-[26px] ${toneClasses.value}`}>
            {value}
          </div>

          <div className="mt-2.5 space-y-1">
            <div className={`text-[12px] font-medium ${toneClasses.meta}`}>{periodLabel}</div>
            {trendText ? (
              <div className={`inline-flex items-center gap-1 text-[12px] font-medium ${trendClasses}`}>
                {TrendIcon ? <TrendIcon className="h-3.5 w-3.5" /> : null}
                <span>{trendText}</span>
              </div>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}

export default function DesktopAnalyticsCard({
  cards,
  periodLabel,
  comparisonLabel,
  hasComparison,
  hasOrdersEver,
  periodOptions,
  extendedOptions = [],
  customRange,
}: Props) {
  const cardIcons: Record<string, ReactNode> = {
    "Total Orders": <Package2 className="h-5 w-5" />,
    "Total Revenue": <CircleDollarSign className="h-5 w-5" />,
    "Active Orders": <PlayCircle className="h-5 w-5" />,
    "Overdue Orders": <AlertTriangle className="h-5 w-5" />,
  };

  return (
    <section id="analytics" className="min-w-0 space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1F2937]">
          <BarChart3 className="h-4 w-4 text-[#9CA3AF]" />
          Summary
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border border-[#E5E7EB] bg-white p-1">
            {periodOptions.map((option) => (
              <a
                key={option.label}
                href={option.href}
                className={[
                  "rounded-md px-3 py-1.5 text-[11px] font-semibold transition",
                  option.active
                    ? "bg-[#6366F1] text-white"
                    : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]",
                ].join(" ")}
              >
                {option.shortLabel}
              </a>
            ))}
          </div>
          {extendedOptions.length > 0 ? (
            <details className="relative">
              <summary className="flex h-9 cursor-pointer list-none items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-3 text-[11px] font-semibold text-[#475467]">
                More
                <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
              </summary>
              <div className="absolute right-0 top-11 z-20 min-w-[140px] rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-[0_12px_24px_rgba(16,24,40,0.12)]">
                {extendedOptions.map((option) => (
                  <a
                    key={option.label}
                    href={option.href}
                    className={[
                      "block rounded-xl px-3 py-2 text-[12px] font-medium transition",
                      option.active
                        ? "bg-[#6366F1] text-white"
                        : "text-[#374151] hover:bg-[#F9FAFB]",
                    ].join(" ")}
                  >
                    {option.label}
                  </a>
                ))}
              </div>
            </details>
          ) : null}
          <div className="text-[11px] font-medium text-[#9CA3AF]">
            {hasComparison && comparisonLabel ? `${periodLabel} vs ${comparisonLabel}` : periodLabel}
          </div>
        </div>
      </div>

      {customRange?.active ? (
        <form method="get" className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-white px-3 py-3">
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
          <div className="flex items-end gap-3">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[11px] font-medium text-[#6B7280]">Start</span>
              <input
                type="date"
                name="sstart"
                defaultValue={customRange.startDate ?? ""}
                className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#374151] outline-none transition focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[11px] font-medium text-[#6B7280]">End</span>
              <input
                type="date"
                name="send"
                defaultValue={customRange.endDate ?? ""}
                className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#374151] outline-none transition focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15"
              />
            </label>
            <a
              href={customRange.resetHref}
              className="inline-flex h-11 min-w-[112px] shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
            >
              Reset
            </a>
            <button
              type="submit"
              className="inline-flex h-11 min-w-[152px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#6366F1] px-4 text-sm font-semibold transition hover:bg-[#5558E3]"
              style={{ color: "#ffffff" }}
              aria-label="Apply custom range"
            >
              <span className="whitespace-nowrap leading-none text-white">Apply</span>
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
            <SummaryCard
              key={card.label}
              label={card.label}
              value={card.value}
              periodLabel={periodLabel}
              hasOrdersEver={hasOrdersEver}
              trendText={card.trendText}
              trendDirection={card.trendDirection}
              trendTone={card.trendTone}
            tone={card.tone}
            icon={cardIcons[card.label]}
          />
        ))}
      </div>
    </section>
  );
}
