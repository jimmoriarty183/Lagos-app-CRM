// Sales forecast for the Business tier (display "Business" = plan code 'pro').
//
// Three signals are computed per item, then combined into a single
// "next 30 days" forecast plus a confidence label and (for stock-managed
// products) a reorder point. Every method is intentionally simple and
// explainable — small business owners must be able to read the table and
// trust it. Fancy ML belongs in a later iteration.

export type ForecastLineInput = {
  itemKey: string; // stable per product/service (or custom name)
  itemName: string;
  itemType: "PRODUCT" | "SERVICE" | "CUSTOM";
  catalogId: string | null;
  isStockManaged: boolean;
  // One row per ordered line, dated by the order's created_at.
  events: Array<{
    soldAt: string; // ISO timestamp
    qty: number;
    netAmount: number;
  }>;
};

export type ForecastConfidence = "high" | "medium" | "low" | "none";

export type ForecastMethod =
  | "moving_average_4w"
  | "run_rate_current_period"
  | "insufficient_data";

export type ForecastResult = {
  itemKey: string;
  itemName: string;
  itemType: "PRODUCT" | "SERVICE" | "CUSTOM";
  catalogId: string | null;
  isStockManaged: boolean;

  // Last 4 calendar weeks (28 days ending at asOf), used as the base signal.
  unitsLast4Weeks: number;
  revenueLast4Weeks: number;
  ordersLast4Weeks: number;
  avgDailyUnits: number;

  // Run-rate of the current calendar month at asOf.
  unitsCurrentMonth: number;
  revenueCurrentMonth: number;
  daysElapsedInMonth: number;
  daysInMonth: number;

  // Headline forecast for the next 30 days.
  forecastUnitsNext30d: number;
  forecastRevenueNext30d: number;
  method: ForecastMethod;
  confidence: ForecastConfidence;

  // Reorder point — only meaningful when isStockManaged.
  reorderPoint: number | null;
  reorderLeadTimeDays: number;
  safetyStockDays: number;

  // Per-week histogram for the sparkline (oldest → newest), 8 weeks back.
  weeklyUnitsLast8w: number[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.round(
    (startOfDay(later).getTime() - startOfDay(earlier).getTime()) / MS_PER_DAY,
  );
}

function lastDayOfMonth(date: Date): number {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
}

function classifyConfidence(input: {
  ordersInWindow: number;
  weeksOfHistory: number;
  spreadDays: number; // distinct days with sales in the 28-day window
}): ForecastConfidence {
  if (input.ordersInWindow === 0) return "none";
  if (input.weeksOfHistory < 2 || input.spreadDays < 2) return "low";
  if (input.weeksOfHistory < 8 || input.ordersInWindow < 4) return "medium";
  return "high";
}

export function computeForecastForItem(
  input: ForecastLineInput,
  asOf: Date,
  options?: { reorderLeadTimeDays?: number; safetyStockDays?: number },
): ForecastResult {
  const leadTime = options?.reorderLeadTimeDays ?? 7;
  const safety = options?.safetyStockDays ?? 3;

  const events = input.events
    .map((event) => ({
      ...event,
      soldAtDate: new Date(event.soldAt),
    }))
    .filter((event) => !Number.isNaN(event.soldAtDate.getTime()))
    .sort((a, b) => a.soldAtDate.getTime() - b.soldAtDate.getTime());

  const asOfStart = startOfDay(asOf);

  // Last-4-weeks window: [asOf - 28d, asOf)
  const window28Start = new Date(asOfStart.getTime() - 28 * MS_PER_DAY);
  const eventsLast28 = events.filter(
    (e) => e.soldAtDate >= window28Start && e.soldAtDate < asOfStart,
  );
  const unitsLast4Weeks = eventsLast28.reduce((s, e) => s + e.qty, 0);
  const revenueLast4Weeks = eventsLast28.reduce((s, e) => s + e.netAmount, 0);
  const ordersLast4Weeks = new Set(
    eventsLast28.map((e) => e.soldAtDate.toISOString().slice(0, 10) + ":" + e.qty),
  ).size;
  const distinctDaysWithSales = new Set(
    eventsLast28.map((e) => e.soldAtDate.toISOString().slice(0, 10)),
  ).size;
  const avgDailyUnits = unitsLast4Weeks / 28;

  // Current calendar month run-rate.
  const monthStart = new Date(
    Date.UTC(asOfStart.getUTCFullYear(), asOfStart.getUTCMonth(), 1),
  );
  const daysInMonth = lastDayOfMonth(asOfStart);
  const daysElapsedInMonth = Math.max(1, daysBetween(asOfStart, monthStart) + 1);
  const eventsCurrentMonth = events.filter(
    (e) => e.soldAtDate >= monthStart && e.soldAtDate <= asOfStart,
  );
  const unitsCurrentMonth = eventsCurrentMonth.reduce((s, e) => s + e.qty, 0);
  const revenueCurrentMonth = eventsCurrentMonth.reduce(
    (s, e) => s + e.netAmount,
    0,
  );

  // Weeks of usable history: rounded weeks between earliest event and asOf.
  const earliest = events[0]?.soldAtDate;
  const weeksOfHistory = earliest
    ? Math.max(0, Math.floor(daysBetween(asOfStart, earliest) / 7))
    : 0;

  // Pick the headline method.
  let method: ForecastMethod;
  let forecastUnitsNext30d: number;
  if (eventsLast28.length === 0 && eventsCurrentMonth.length === 0) {
    method = "insufficient_data";
    forecastUnitsNext30d = 0;
  } else if (weeksOfHistory >= 4 && eventsLast28.length >= 2) {
    method = "moving_average_4w";
    forecastUnitsNext30d = avgDailyUnits * 30;
  } else {
    method = "run_rate_current_period";
    const currentDailyRate = unitsCurrentMonth / daysElapsedInMonth;
    forecastUnitsNext30d = currentDailyRate * 30;
  }

  // Forecast revenue uses the last-28-days average price-per-unit when
  // available, otherwise current-month average. This handles price changes
  // gracefully without being misleading when there's no recent history.
  const avgUnitPriceRecent =
    unitsLast4Weeks > 0
      ? revenueLast4Weeks / unitsLast4Weeks
      : unitsCurrentMonth > 0
        ? revenueCurrentMonth / unitsCurrentMonth
        : 0;
  const forecastRevenueNext30d = forecastUnitsNext30d * avgUnitPriceRecent;

  const confidence = classifyConfidence({
    ordersInWindow: eventsLast28.length,
    weeksOfHistory,
    spreadDays: distinctDaysWithSales,
  });

  // Reorder point — only when stock-managed and we have a positive signal.
  const reorderPoint = input.isStockManaged
    ? avgDailyUnits > 0
      ? Math.ceil(avgDailyUnits * (leadTime + safety))
      : 0
    : null;

  // Per-week histogram for sparkline (8 weeks ending at asOf).
  const weeklyUnitsLast8w: number[] = Array.from({ length: 8 }, (_, weekIdx) => {
    const fromDays = (8 - weekIdx) * 7;
    const toDays = (7 - weekIdx) * 7;
    const from = new Date(asOfStart.getTime() - fromDays * MS_PER_DAY);
    const to = new Date(asOfStart.getTime() - toDays * MS_PER_DAY);
    return events
      .filter((e) => e.soldAtDate >= from && e.soldAtDate < to)
      .reduce((s, e) => s + e.qty, 0);
  });

  return {
    itemKey: input.itemKey,
    itemName: input.itemName,
    itemType: input.itemType,
    catalogId: input.catalogId,
    isStockManaged: input.isStockManaged,
    unitsLast4Weeks,
    revenueLast4Weeks,
    ordersLast4Weeks,
    avgDailyUnits,
    unitsCurrentMonth,
    revenueCurrentMonth,
    daysElapsedInMonth,
    daysInMonth,
    forecastUnitsNext30d,
    forecastRevenueNext30d,
    method,
    confidence,
    reorderPoint,
    reorderLeadTimeDays: leadTime,
    safetyStockDays: safety,
    weeklyUnitsLast8w,
  };
}

export function aggregateForecastTotals(rows: ForecastResult[]): {
  forecastRevenueNext30d: number;
  forecastUnitsNext30d: number;
  itemsWithSignal: number;
  itemsByConfidence: Record<ForecastConfidence, number>;
} {
  const itemsByConfidence: Record<ForecastConfidence, number> = {
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  };
  let forecastRevenueNext30d = 0;
  let forecastUnitsNext30d = 0;
  let itemsWithSignal = 0;
  for (const row of rows) {
    forecastRevenueNext30d += row.forecastRevenueNext30d;
    forecastUnitsNext30d += row.forecastUnitsNext30d;
    if (row.confidence !== "none") itemsWithSignal += 1;
    itemsByConfidence[row.confidence] += 1;
  }
  return {
    forecastRevenueNext30d,
    forecastUnitsNext30d,
    itemsWithSignal,
    itemsByConfidence,
  };
}
