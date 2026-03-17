import { cache } from "react";
import { loadAdminDataset } from "@/lib/admin/queries";

export const ANALYTICS_PERIODS = ["7d", "30d", "90d", "all"] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

type TrendPoint = {
  label: string;
  registrations: number;
  businesses: number;
};

type FunnelStep = {
  key: string;
  label: string;
  value: number;
  rateFromPrevious: number | null;
  rateFromStart: number | null;
};

type ActivityPoint = {
  userId: string;
  timestamp: number;
};

function startOfDayMs(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfWeekMs(timestamp: number) {
  const date = new Date(startOfDayMs(timestamp));
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date.getTime();
}

function startOfMonthMs(timestamp: number) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function percent(part: number, total: number) {
  if (!total) return null;
  return (part / total) * 100;
}

function growthRate(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function bucketMode(period: AnalyticsPeriod, spanDays: number) {
  if (period === "all" || spanDays > 120) return "month" as const;
  if (spanDays > 31) return "week" as const;
  return "day" as const;
}

function createBuckets(startMs: number, endMs: number, mode: ReturnType<typeof bucketMode>) {
  const buckets: { startMs: number; endMs: number; label: string }[] = [];
  let cursor =
    mode === "month" ? startOfMonthMs(startMs) : mode === "week" ? startOfWeekMs(startMs) : startOfDayMs(startMs);

  while (cursor < endMs) {
    const next =
      mode === "month"
        ? new Date(new Date(cursor).getFullYear(), new Date(cursor).getMonth() + 1, 1).getTime()
        : mode === "week"
          ? cursor + 1000 * 60 * 60 * 24 * 7
          : cursor + 1000 * 60 * 60 * 24;

    const label =
      mode === "month"
        ? new Intl.DateTimeFormat("ru-RU", { month: "short", year: "2-digit" }).format(cursor)
        : mode === "week"
          ? `Нед ${new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(cursor)}`
          : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(cursor);

    buckets.push({ startMs: cursor, endMs: next, label });
    cursor = next;
  }

  return buckets;
}

function inRange(timestamp: number, startMs: number, endMs: number) {
  return timestamp >= startMs && timestamp < endMs;
}

function buildOwnedBusinessMap(dataset: Awaited<ReturnType<typeof loadAdminDataset>>) {
  const ownedBusinessIdsByUser = new Map<string, Set<string>>();

  for (const business of dataset.businesses) {
    const add = (userId: string | null | undefined) => {
      const normalized = String(userId ?? "").trim();
      if (!normalized) return;
      const current = ownedBusinessIdsByUser.get(normalized) ?? new Set<string>();
      current.add(business.id);
      ownedBusinessIdsByUser.set(normalized, current);
    };

    add(business.ownerId);
    add(business.createdBy);

    for (const membership of business.memberships) {
      if (membership.role === "OWNER") add(membership.userId);
    }
  }

  return ownedBusinessIdsByUser;
}

function buildActivityPoints(dataset: Awaited<ReturnType<typeof loadAdminDataset>>) {
  const points: ActivityPoint[] = [];

  for (const activity of dataset.activities) {
    const userId = String(activity.userId ?? "").trim();
    if (!userId || !activity.createdAtMs) continue;
    points.push({ userId, timestamp: activity.createdAtMs });
  }

  return points;
}

function uniqueUsersInWindow(points: ActivityPoint[], sinceMs: number, untilMs: number) {
  return new Set(
    points.filter((point) => point.timestamp >= sinceMs && point.timestamp < untilMs).map((point) => point.userId),
  ).size;
}

function buildTrendSeries(
  dataset: Awaited<ReturnType<typeof loadAdminDataset>>,
  startMs: number,
  endMs: number,
  period: AnalyticsPeriod,
) {
  const dayMs = 1000 * 60 * 60 * 24;
  const spanDays = Math.max(1, Math.ceil((endMs - startMs) / dayMs));
  const mode = bucketMode(period, spanDays);
  const buckets = createBuckets(startMs, endMs, mode);

  return buckets.map((bucket) => ({
    label: bucket.label,
    registrations: dataset.authUsers.filter((item) => inRange(item.createdAtMs, bucket.startMs, bucket.endMs)).length,
    businesses: dataset.businesses.filter((item) => inRange(item.createdAtMs, bucket.startMs, bucket.endMs)).length,
  }));
}

function buildFunnel(
  registeredUsers: { id: string; hasSignIn: boolean }[],
  createdBusinessIds: Set<string>,
  usersWithOwnedBusinessOrders: Set<string>,
) {
  const registered = registeredUsers.length;
  const signedIn = registeredUsers.filter((user) => user.hasSignIn).length;
  const createdBusiness = registeredUsers.filter((user) => createdBusinessIds.has(user.id)).length;
  const firstOrder = registeredUsers.filter((user) => usersWithOwnedBusinessOrders.has(user.id)).length;

  const steps: FunnelStep[] = [
    {
      key: "registered",
      label: "Зарегистрировались",
      value: registered,
      rateFromPrevious: registered ? 100 : null,
      rateFromStart: registered ? 100 : null,
    },
    {
      key: "signed_in",
      label: "Сделали первый вход",
      value: signedIn,
      rateFromPrevious: percent(signedIn, registered),
      rateFromStart: percent(signedIn, registered),
    },
    {
      key: "created_business",
      label: "Создали бизнес",
      value: createdBusiness,
      rateFromPrevious: percent(createdBusiness, signedIn),
      rateFromStart: percent(createdBusiness, registered),
    },
    {
      key: "first_order",
      label: "Дошли до первого заказа",
      value: firstOrder,
      rateFromPrevious: percent(firstOrder, createdBusiness),
      rateFromStart: percent(firstOrder, registered),
    },
  ];

  return steps;
}

export const loadAdminAnalytics = cache(async (period: AnalyticsPeriod) => {
  const dataset = await loadAdminDataset();
  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;

  const timestamps = [
    ...dataset.authUsers.map((item) => item.createdAtMs).filter(Boolean),
    ...dataset.businesses.map((item) => item.createdAtMs).filter(Boolean),
    ...dataset.invites.map((item) => item.createdAtMs).filter(Boolean),
    ...dataset.orders.map((item) => item.createdAtMs).filter(Boolean),
    ...dataset.activities.map((item) => item.createdAtMs).filter(Boolean),
  ];

  const fallbackStart = startOfDayMs(now - dayMs * 29);
  const firstDataAt = timestamps.length ? Math.min(...timestamps) : fallbackStart;
  const rangeStartMs =
    period === "7d"
      ? startOfDayMs(now - dayMs * 6)
      : period === "30d"
        ? startOfDayMs(now - dayMs * 29)
        : period === "90d"
          ? startOfDayMs(now - dayMs * 89)
          : startOfDayMs(firstDataAt);
  const rangeEndMs = now;
  const rangeDays = Math.max(1, Math.ceil((rangeEndMs - rangeStartMs) / dayMs));

  const previousRangeStartMs = period === "all" ? null : rangeStartMs - rangeDays * dayMs;
  const previousRangeEndMs = period === "all" ? null : rangeStartMs;

  const currentUsers = dataset.authUsers.filter((item) => inRange(item.createdAtMs, rangeStartMs, rangeEndMs));
  const previousUsers =
    previousRangeStartMs === null || previousRangeEndMs === null
      ? []
      : dataset.authUsers.filter((item) => inRange(item.createdAtMs, previousRangeStartMs, previousRangeEndMs));

  const currentBusinesses = dataset.businesses.filter((item) => inRange(item.createdAtMs, rangeStartMs, rangeEndMs));
  const previousBusinesses =
    previousRangeStartMs === null || previousRangeEndMs === null
      ? []
      : dataset.businesses.filter((item) => inRange(item.createdAtMs, previousRangeStartMs, previousRangeEndMs));

  const ownedBusinessIdsByUser = buildOwnedBusinessMap(dataset);
  const businessIdsWithOrders = new Set(dataset.businesses.filter((item) => item.ordersCount > 0).map((item) => item.id));

  const usersWhoCreatedBusiness = new Set(
    Array.from(ownedBusinessIdsByUser.entries())
      .filter(([, businessIds]) => businessIds.size > 0)
      .map(([userId]) => userId),
  );

  const usersWithOwnedBusinessOrders = new Set(
    Array.from(ownedBusinessIdsByUser.entries())
      .filter(([, businessIds]) => Array.from(businessIds).some((businessId) => businessIdsWithOrders.has(businessId)))
      .map(([userId]) => userId),
  );

  const registrationsCurrent = currentUsers.length;
  const registrationsPrevious = previousUsers.length;
  const registrationGrowthRate =
    previousRangeStartMs === null ? null : growthRate(registrationsCurrent, registrationsPrevious);

  const businessesCurrent = currentBusinesses.length;
  const businessesPrevious = previousBusinesses.length;
  const businessesGrowthRate = previousRangeStartMs === null ? null : growthRate(businessesCurrent, businessesPrevious);

  const signedInUsers = currentUsers.filter((item) => item.hasSignIn).length;
  const usersWithBusiness = currentUsers.filter((item) => usersWhoCreatedBusiness.has(item.id)).length;
  const usersWithFirstOrder = currentUsers.filter((item) => usersWithOwnedBusinessOrders.has(item.id)).length;

  const activityPoints = buildActivityPoints(dataset);
  const dau = uniqueUsersInWindow(activityPoints, now - dayMs, now);
  const wau = uniqueUsersInWindow(activityPoints, now - dayMs * 7, now);
  const mau = uniqueUsersInWindow(activityPoints, now - dayMs * 30, now);
  const stickiness = mau > 0 ? (dau / mau) * 100 : null;

  return {
    period,
    rangeStartMs,
    rangeEndMs,
    rangeDays,
    previousRangeStartMs,
    previousRangeEndMs,
    rangeLabel:
      period === "all"
        ? "За весь период"
        : `За последние ${period === "7d" ? "7 дней" : period === "30d" ? "30 дней" : "90 дней"}`,
    comparisons: {
      registrationsCurrent,
      registrationsPrevious,
      registrationGrowthRate,
      businessesCurrent,
      businessesPrevious,
      businessesGrowthRate,
    },
    kpis: {
      registrationsCurrent,
      businessesCurrent,
      signedInUsers,
      usersWithBusiness,
      usersWithFirstOrder,
      dau,
      wau,
      mau,
      stickiness,
    },
    activation: {
      registeredUsers: registrationsCurrent,
      signedInUsers,
      signedInRate: percent(signedInUsers, registrationsCurrent),
      usersWithBusiness,
      usersWithBusinessRate: percent(usersWithBusiness, registrationsCurrent),
      usersWithFirstOrder,
      usersWithFirstOrderRate: percent(usersWithFirstOrder, registrationsCurrent),
      businessDefinition:
        "Пользователь считается дошедшим до бизнеса, если он создал бизнес, назначен владельцем или имеет роль OWNER.",
      orderDefinition:
        "Шаг заказа считается по бизнесам, где пользователь является создателем или владельцем, и в этом бизнесе уже есть хотя бы один заказ.",
    },
    engagement: {
      dau,
      wau,
      mau,
      stickiness,
      methodology:
        "Активность считается по доступным действиям: последний вход, создание бизнеса, действия с приглашениями, заказы и зафиксированные системные события. Это best effort, а не полноценный product analytics log.",
    },
    funnel: buildFunnel(currentUsers, usersWhoCreatedBusiness, usersWithOwnedBusinessOrders),
    trendSeries: buildTrendSeries(dataset, rangeStartMs, rangeEndMs, period),
  };
});
