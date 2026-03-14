export type DashboardRange =
  | "last1Day"
  | "last90Days"
  | "last1Year"
  | "today"
  | "yesterday"
  | "last7Days"
  | "last30Days"
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "last6Months"
  | "thisYear"
  | "ALL"
  | "custom";

export type TrendDirection = "up" | "down" | "neutral";
export type TrendTone = "positive" | "negative" | "neutral";
export type ComparisonMode = "percent" | "absolute";

export type DashboardOrderLike = {
  created_at?: string | null;
  amount?: number | string | null;
  status?: string | null;
  due_date?: string | null;
};

export type MetricSnapshot = {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  overdueOrders: number;
};

export type TimeWindow = {
  startMs: number | null;
  endMs: number | null;
  label: string;
};

export type DashboardPeriod = {
  key: DashboardRange;
  current: TimeWindow;
  previous: TimeWindow | null;
  comparisonLabel: string | null;
};

export type MetricComparison = {
  text: string | null;
  direction: TrendDirection;
  tone: TrendTone;
  delta: number | null;
};

export const DEFAULT_DASHBOARD_RANGE: DashboardRange = "last7Days";
export const DEFAULT_SUMMARY_RANGE: DashboardRange = "last30Days";

export const SUMMARY_RANGE_OPTIONS: Array<{ value: DashboardRange; label: string; shortLabel: string }> = [
  { value: "last1Day", label: "Last 1 day", shortLabel: "1D" },
  { value: "last7Days", label: "Last 7 days", shortLabel: "7D" },
  { value: "last30Days", label: "Last 30 days", shortLabel: "30D" },
];

export const DASHBOARD_RANGE_OPTIONS: Array<{ value: DashboardRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7Days", label: "Last 7 days" },
  { value: "last30Days", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "last3Months", label: "Last 3 months" },
  { value: "last6Months", label: "Last 6 months" },
  { value: "thisYear", label: "This year" },
  { value: "ALL", label: "All time" },
  { value: "custom", label: "Custom range" },
];

const RANGE_ALIASES: Record<string, DashboardRange> = {
  all: "ALL",
  last1day: "last1Day",
  "last-1-day": "last1Day",
  last90days: "last90Days",
  "last-90-days": "last90Days",
  last1year: "last1Year",
  "last-1-year": "last1Year",
  "1y": "last1Year",
  today: "today",
  yesterday: "yesterday",
  week: "last7Days",
  last7days: "last7Days",
  "last-7-days": "last7Days",
  last30days: "last30Days",
  "last-30-days": "last30Days",
  month: "thisMonth",
  thismonth: "thisMonth",
  "this-month": "thisMonth",
  lastmonth: "lastMonth",
  "last-month": "lastMonth",
  last3months: "last3Months",
  "last-3-months": "last3Months",
  last6months: "last6Months",
  "last-6-months": "last6Months",
  year: "thisYear",
  thisyear: "thisYear",
  "this-year": "thisYear",
  custom: "custom",
};

function cloneDate(input: Date) {
  return new Date(input.getTime());
}

function startOfDay(input: Date) {
  const value = cloneDate(input);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDayExclusive(input: Date) {
  return addDays(startOfDay(input), 1);
}

function startOfMonth(input: Date) {
  const value = cloneDate(input);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfYear(input: Date) {
  const value = cloneDate(input);
  value.setMonth(0, 1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(input: Date, days: number) {
  const value = cloneDate(input);
  value.setDate(value.getDate() + days);
  return value;
}

function addMonths(input: Date, months: number) {
  const value = cloneDate(input);
  value.setMonth(value.getMonth() + months);
  return value;
}

function addYears(input: Date, years: number) {
  const value = cloneDate(input);
  value.setFullYear(value.getFullYear() + years);
  return value;
}

function minMs(a: number, b: number) {
  return a < b ? a : b;
}

function formatRangeLabel(start: Date, endExclusive: Date) {
  const endInclusive = addDays(endExclusive, -1);
  const sameYear = start.getFullYear() === endInclusive.getFullYear();
  const sameMonth = sameYear && start.getMonth() === endInclusive.getMonth();

  const startFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(start);

  const endFmt = new Intl.DateTimeFormat("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  }).format(endInclusive);

  return `${startFmt} - ${endFmt}`;
}

function sameElapsedWindow(
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousBoundaryEnd: Date,
) {
  const duration = Math.max(currentEnd.getTime() - currentStart.getTime(), 1);
  return {
    startMs: previousStart.getTime(),
    endMs: minMs(previousStart.getTime() + duration, previousBoundaryEnd.getTime()),
  };
}

function fullWindow(start: Date, endExclusive: Date, label: string): TimeWindow {
  return {
    startMs: start.getTime(),
    endMs: endExclusive.getTime(),
    label,
  };
}

function isValidDateInput(value?: string | null) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""));
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeDateInput(value?: string | null) {
  if (!isValidDateInput(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : formatDateInput(parsed);
}

function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function normalizeDashboardRange(
  input?: string | null,
  fallback: DashboardRange = DEFAULT_DASHBOARD_RANGE,
): DashboardRange {
  const raw = String(input ?? fallback).trim();
  const normalized = raw.toLowerCase();
  return RANGE_ALIASES[normalized] ?? fallback;
}

export function resolveDashboardRangeInput({
  range,
  startDate,
  endDate,
  fallbackRange = DEFAULT_DASHBOARD_RANGE,
}: {
  range?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  fallbackRange?: DashboardRange;
}) {
  const normalizedRange = normalizeDashboardRange(range, fallbackRange);
  const normalizedStart = normalizeDateInput(startDate);
  const normalizedEnd = normalizeDateInput(endDate);

  return {
    range: normalizedRange,
    startDate: normalizedStart,
    endDate: normalizedEnd,
  };
}

export function getDashboardPeriod(
  range: DashboardRange,
  options?: {
    now?: Date;
    startDate?: string | null;
    endDate?: string | null;
  },
): DashboardPeriod {
  const now = options?.now ?? new Date();
  const startDate = normalizeDateInput(options?.startDate);
  const endDate = normalizeDateInput(options?.endDate);

  if (range === "custom" && (!startDate || !endDate)) {
    return getDashboardPeriod(DEFAULT_DASHBOARD_RANGE, { now });
  }

  if (range === "ALL") {
    return {
      key: range,
      current: { startMs: null, endMs: null, label: "All time" },
      previous: null,
      comparisonLabel: null,
    };
  }

  if (range === "custom" && startDate && endDate) {
    const start = parseDateInput(startDate);
    const end = parseDateInput(endDate);
    const normalizedStart = start <= end ? start : end;
    const normalizedEnd = start <= end ? end : start;
    const currentStart = startOfDay(normalizedStart);
    const currentEnd = endOfDayExclusive(normalizedEnd);
    const dayCount = Math.max(
      1,
      Math.round((currentEnd.getTime() - currentStart.getTime()) / 86_400_000),
    );
    const previousEnd = currentStart;
    const previousStart = addDays(previousEnd, -dayCount);

    return {
      key: range,
      current: fullWindow(currentStart, currentEnd, formatRangeLabel(currentStart, currentEnd)),
      previous: fullWindow(previousStart, previousEnd, "Previous range"),
      comparisonLabel: "previous range",
    };
  }

  if (range === "yesterday") {
    const currentStart = startOfDay(addDays(now, -1));
    const currentEnd = startOfDay(now);
    const previousStart = addDays(currentStart, -1);
    return {
      key: range,
      current: fullWindow(currentStart, currentEnd, "Yesterday"),
      previous: fullWindow(previousStart, currentStart, "Previous day"),
      comparisonLabel: "previous day",
    };
  }

  if (range === "last1Day") {
    const currentStart = startOfDay(now);
    const previousStart = addDays(currentStart, -1);

    return {
      key: range,
      current: { startMs: currentStart.getTime(), endMs: now.getTime(), label: "Last 1 day" },
      previous: {
        ...sameElapsedWindow(currentStart, now, previousStart, currentStart),
        label: "Previous day",
      },
      comparisonLabel: "previous day",
    };
  }

  if (range === "today") {
    const currentStart = startOfDay(now);
    const previousStart = addDays(currentStart, -1);

    return {
      key: range,
      current: { startMs: currentStart.getTime(), endMs: now.getTime(), label: "Today" },
      previous: {
        ...sameElapsedWindow(currentStart, now, previousStart, currentStart),
        label: "Yesterday",
      },
      comparisonLabel: "yesterday",
    };
  }

  if (range === "last7Days") {
    const currentStart = startOfDay(addDays(now, -6));
    const previousStart = addDays(currentStart, -7);
    return {
      key: range,
      current: { startMs: currentStart.getTime(), endMs: now.getTime(), label: "Last 7 days" },
      previous: fullWindow(previousStart, currentStart, "Previous 7 days"),
      comparisonLabel: "previous 7 days",
    };
  }

  if (range === "last30Days") {
    const currentStart = startOfDay(addDays(now, -29));
    const previousStart = addDays(currentStart, -30);
    return {
      key: range,
      current: { startMs: currentStart.getTime(), endMs: now.getTime(), label: "Last 30 days" },
      previous: fullWindow(previousStart, currentStart, "Previous 30 days"),
      comparisonLabel: "previous 30 days",
    };
  }

  if (range === "last90Days") {
    const currentStart = startOfDay(addDays(now, -89));
    const previousStart = addDays(currentStart, -90);
    return {
      key: range,
      current: { startMs: currentStart.getTime(), endMs: now.getTime(), label: "Last 90 days" },
      previous: fullWindow(previousStart, currentStart, "Previous 90 days"),
      comparisonLabel: "previous 90 days",
    };
  }

  if (range === "last1Year") {
    const currentStart = startOfDay(addYears(now, -1));
    const previousStart = startOfDay(addYears(now, -2));
    return {
      key: range,
      current: { startMs: currentStart.getTime(), endMs: now.getTime(), label: "Last year" },
      previous: fullWindow(previousStart, currentStart, "Previous year"),
      comparisonLabel: "previous year",
    };
  }

  if (range === "thisMonth") {
    const currentStart = startOfMonth(now);
    const previousStart = startOfMonth(addMonths(now, -1));
    return {
      key: range,
      current: { startMs: currentStart.getTime(), endMs: now.getTime(), label: "This month" },
      previous: {
        ...sameElapsedWindow(currentStart, now, previousStart, currentStart),
        label: "previous month",
      },
      comparisonLabel: "previous month",
    };
  }

  if (range === "lastMonth") {
    const currentStart = startOfMonth(addMonths(now, -1));
    const currentEnd = startOfMonth(now);
    const previousStart = startOfMonth(addMonths(now, -2));
    return {
      key: range,
      current: fullWindow(currentStart, currentEnd, "Last month"),
      previous: fullWindow(previousStart, currentStart, "Month before last"),
      comparisonLabel: "month before last",
    };
  }

  if (range === "last3Months") {
    const currentStart = startOfDay(addMonths(now, -3));
    const previousStart = startOfDay(addMonths(now, -6));
    const previousEnd = currentStart;
    return {
      key: range,
      current: { startMs: currentStart.getTime(), endMs: now.getTime(), label: "Last 3 months" },
      previous: fullWindow(previousStart, previousEnd, "Previous 3 months"),
      comparisonLabel: "previous 3 months",
    };
  }

  if (range === "last6Months") {
    const currentStart = startOfDay(addMonths(now, -6));
    const previousStart = startOfDay(addMonths(now, -12));
    const previousEnd = currentStart;
    return {
      key: range,
      current: { startMs: currentStart.getTime(), endMs: now.getTime(), label: "Last 6 months" },
      previous: fullWindow(previousStart, previousEnd, "Previous 6 months"),
      comparisonLabel: "previous 6 months",
    };
  }

  const currentStart = startOfYear(now);
  const previousStart = startOfYear(addYears(now, -1));
  return {
    key: "thisYear",
    current: { startMs: currentStart.getTime(), endMs: now.getTime(), label: "This year" },
    previous: {
      ...sameElapsedWindow(currentStart, now, previousStart, currentStart),
      label: "previous year",
    },
    comparisonLabel: "previous year",
  };
}

export function filterOrdersByCreatedAt<T extends DashboardOrderLike>(
  rows: T[],
  window: TimeWindow,
) {
  if (window.startMs === null || window.endMs === null) return rows;

  return rows.filter((row) => {
    if (!row?.created_at) return false;
    const timestamp = Date.parse(String(row.created_at));
    return Number.isFinite(timestamp) && timestamp >= window.startMs && timestamp < window.endMs;
  });
}

export function isOrderActive(row: DashboardOrderLike) {
  return row.status === "NEW" || row.status === "IN_PROGRESS";
}

export function isOrderOverdue(row: DashboardOrderLike, todayISO: string) {
  const dueISO = row?.due_date ? String(row.due_date).slice(0, 10) : null;
  return Boolean(dueISO && dueISO < todayISO && isOrderActive(row));
}

export function getMetricSnapshot<T extends DashboardOrderLike>(rows: T[], todayISO: string) {
  return rows.reduce<MetricSnapshot>(
    (acc, row) => {
      acc.totalOrders += 1;
      acc.totalRevenue += Number(row.amount || 0);
      if (isOrderActive(row)) acc.activeOrders += 1;
      if (isOrderOverdue(row, todayISO)) acc.overdueOrders += 1;
      return acc;
    },
    {
      totalOrders: 0,
      totalRevenue: 0,
      activeOrders: 0,
      overdueOrders: 0,
    },
  );
}

export function formatMetricComparison({
  current,
  previous,
  comparisonLabel,
  mode,
  improvement = "up",
  zeroPreviousBehavior = "new",
  formatAbsoluteValue,
}: {
  current: number;
  previous: number | null;
  comparisonLabel: string | null;
  mode: ComparisonMode;
  improvement?: TrendDirection;
  zeroPreviousBehavior?: "new" | "absolute";
  formatAbsoluteValue?: (value: number) => string;
}): MetricComparison {
  if (previous === null || !comparisonLabel) {
    return { text: null, direction: "neutral", tone: "neutral", delta: null };
  }

  const delta = current - previous;
  const direction: TrendDirection =
    delta === 0 ? "neutral" : delta > 0 ? "up" : "down";
  const tone =
    direction === "neutral"
      ? "neutral"
      : direction === improvement
        ? "positive"
        : "negative";

  if (delta === 0) {
    return {
      text: current === 0 && previous === 0 ? "No data yet" : `No change vs ${comparisonLabel}`,
      direction,
      tone,
      delta,
    };
  }

  if (mode === "absolute") {
    if (previous === 0 && current > 0) {
      return {
        text: `${formatAbsoluteValue ? formatAbsoluteValue(current) : `+${current}`} vs ${comparisonLabel}`,
        direction,
        tone,
        delta,
      };
    }

    return {
      text: `${delta > 0 ? "+" : "-"}${Math.abs(delta)} vs ${comparisonLabel}`,
      direction,
      tone,
      delta,
    };
  }

  if (previous === 0 && current > 0) {
    return {
      text:
        zeroPreviousBehavior === "absolute"
          ? `${formatAbsoluteValue ? formatAbsoluteValue(current) : `+${current}`} vs ${comparisonLabel}`
          : "New",
      direction,
      tone,
      delta,
    };
  }

  const percentage = Math.round((Math.abs(delta) / previous) * 100);
  return {
    text: `${percentage}% vs ${comparisonLabel}`,
    direction,
    tone,
    delta,
  };
}
