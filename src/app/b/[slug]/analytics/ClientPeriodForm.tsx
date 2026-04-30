"use client";

import { useState } from "react";

type MonthOption = { value: string; label: string };

type Props = {
  phoneRaw: string;
  tab: string;
  initialMode: "month" | "custom";
  parsedClientMonth: number;
  parsedClientYear: number;
  clientMonthOptions: MonthOption[];
  clientYearOptions: number[];
  customFrom: string;
  customTo: string;
  clientRangeLabel: string;
  currentMonthHref: string;
};

export default function ClientPeriodForm({
  phoneRaw,
  tab,
  initialMode,
  parsedClientMonth,
  parsedClientYear,
  clientMonthOptions,
  clientYearOptions,
  customFrom,
  customTo,
  clientRangeLabel,
  currentMonthHref,
}: Props) {
  const [mode, setMode] = useState<"month" | "custom">(initialMode);

  return (
    <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#111827]">Period</h3>
        <div className="text-xs text-[#6B7280] dark:text-white/55">{clientRangeLabel}</div>
      </div>
      <form className="grid gap-3 md:grid-cols-5" method="get">
        {phoneRaw ? <input type="hidden" name="u" value={phoneRaw} /> : null}
        <input type="hidden" name="tab" value={tab} />
        <label className="grid gap-1 text-xs font-medium text-[#475467] dark:text-white/70">
          Mode
          <select
            name="cmode"
            value={mode}
            onChange={(e) => setMode(e.target.value as "month" | "custom")}
            className="h-10 rounded-lg border border-[#D0D5DD] bg-white dark:bg-white/[0.03] px-3 text-sm text-[#111827]"
          >
            <option value="month">Month</option>
            <option value="custom">Custom range</option>
          </select>
        </label>

        {mode === "month" ? (
          <>
            <label className="grid gap-1 text-xs font-medium text-[#475467] dark:text-white/70">
              Month
              <select
                name="cmonth"
                defaultValue={String(parsedClientMonth)}
                className="h-10 rounded-lg border border-[#D0D5DD] bg-white dark:bg-white/[0.03] px-3 text-sm text-[#111827]"
              >
                {clientMonthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-[#475467] dark:text-white/70">
              Year
              <select
                name="cyear"
                defaultValue={String(parsedClientYear)}
                className="h-10 rounded-lg border border-[#D0D5DD] bg-white dark:bg-white/[0.03] px-3 text-sm text-[#111827]"
              >
                {clientYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            {/* Spacer to keep buttons aligned */}
            <div className="hidden md:block" />
            <div className="hidden md:block" />
          </>
        ) : (
          <>
            {/* Spacer for month/year columns */}
            <div className="hidden md:block" />
            <div className="hidden md:block" />
            <label className="grid gap-1 text-xs font-medium text-[#475467] dark:text-white/70">
              From
              <input
                type="date"
                name="cfrom"
                defaultValue={customFrom}
                className="h-10 rounded-lg border border-[#D0D5DD] bg-white dark:bg-white/[0.03] px-3 text-sm text-[#111827]"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-[#475467] dark:text-white/70">
              To
              <input
                type="date"
                name="cto"
                defaultValue={customTo}
                className="h-10 rounded-lg border border-[#D0D5DD] bg-white dark:bg-white/[0.03] px-3 text-sm text-[#111827]"
              />
            </label>
          </>
        )}

        <div className="md:col-span-5 flex items-center justify-end gap-2">
          <a
            href={currentMonthHref}
            className="rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm font-medium text-[#344054]"
          >
            Current month
          </a>
          <button
            type="submit"
            className="rounded-lg bg-[var(--brand-600)] px-3 py-2 text-sm font-semibold text-white"
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  );
}
