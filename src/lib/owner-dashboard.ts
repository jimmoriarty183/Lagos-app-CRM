import type { SupabaseClient } from "@supabase/supabase-js";

type OrderTaskFactRow = {
  task_id: string;
  business_id: string;
  manager_id: string | null;
  status: string;
  due_date: string | null;
  closed_at: string | null;
  is_active: boolean;
  is_done: boolean;
  base_effort_points: number;
};

type FollowupFactRow = {
  followup_id: string;
  business_id: string;
  manager_id: string | null;
  status: string;
  due_date_effective: string | null;
  completed_at: string | null;
};

type ManagerRosterRow = {
  business_id: string;
  manager_id: string;
  manager_name: string;
};

type ManagerCapacityRow = {
  business_id: string;
  manager_id: string;
  daily_capacity_hours: number | string;
};

type OrderLabelRow = {
  id: string;
  order_number: string | number | null;
  client_name: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

type FollowupLabelRow = {
  id: string;
  title: string | null;
  order_id: string | null;
};

type SalesOrderRow = {
  id: string;
  manager_id: string | null;
  amount: number | string | null;
  status: string | null;
  due_date: string | null;
  updated_at: string | null;
};

type SalesTargetRow = {
  business_id: string;
  manager_id: string | null;
  month_start: string;
  plan_amount: number | string | null;
  plan_closed_orders: number | string | null;
};

export type OwnerDashboardSummary = {
  active_tasks: number;
  overdue_tasks: number;
  due_7d: number;
  on_time_completion_pct: number | null;
  team_workload_pct: number;
  managers_at_risk: number;
  generated_at: string;
};

export type DeadlineControl = {
  traffic_bar: {
    on_track: number;
    at_risk: number;
    overdue: number;
    no_deadline: number;
  };
  top_overdue_tasks: Array<{
    task_id: string;
    task_title: string;
    manager_id: string | null;
    manager_name: string;
    days_overdue: number;
    recommended_action: string;
  }>;
};

export type RiskBreakdown = {
  overdue_points: number;
  due7_points: number;
  workload_points: number;
  followup_points: number;
  ontime_points: number;
  no_deadline_points: number;
  inputs: {
    overdue_count: number;
    due_7d_ratio: number;
    workload_pct: number;
    followup_overdue_ratio: number;
    on_time_30d_pct: number | null;
    on_time_30d_sample_size: number;
    no_deadline_ratio: number;
  };
};

export type OwnerManagerRow = {
  manager_id: string;
  manager_name: string;
  active_tasks: number;
  overdue: number;
  due_7d: number;
  workload_pct: number;
  on_time_pct_30d: number | null;
  overdue_followups: number;
  risk_score: number;
  risk_level: "low" | "medium" | "high";
  risk_breakdown: RiskBreakdown;
  recommended_action: string;
};

export type OwnerAlert = {
  alert_id: string;
  created_at: string;
  scope: "manager" | "task" | "team";
  scope_id: string;
  problem: string;
  reason: string;
  recommended_action: string;
  severity: "medium" | "high" | "critical";
  status: "new" | "in_progress" | "resolved";
};

export type ManagerDailyReport = {
  report_id: string;
  manager_id: string;
  manager_name: string;
  work_date: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  tracked_hours: number | null;
  in_work_hours: number | null;
  paused_hours: number | null;
  daily_summary: string | null;
  completed_today_count: number;
  completed_today_items: Array<{ label: string; href: string | null }>;
  tomorrow_plan_count: number;
  tomorrow_plan_items: Array<{ label: string; href: string | null }>;
};

export type ProductivityPeriod = "day" | "week" | "month";

export type ProductivityManagerRow = {
  manager_id: string;
  manager_name: string;
  closed_orders: number;
  closed_followups: number;
  total_closed: number;
};

export type ProductivitySnapshot = {
  period: ProductivityPeriod;
  start_date: string;
  end_date: string;
  team_closed_orders: number;
  team_closed_followups: number;
  team_total_closed: number;
  managers: ProductivityManagerRow[];
};

export type SalesManagerRow = {
  manager_id: string;
  manager_name: string;
  planned_amount: number;
  actual_amount: number;
  forecast_amount: number;
  plan_closed_orders: number;
  closed_orders: number;
  forecast_closed_orders: number;
  achievement_pct: number;
  forecast_achievement_pct: number;
  forecast_gap_pct: number;
};

export type SalesSnapshot = {
  period: ProductivityPeriod;
  start_date: string;
  end_date: string;
  days_elapsed: number;
  days_total: number;
  selected_manager_id: string | null;
  team_plan_amount: number;
  team_actual_amount: number;
  team_forecast_amount: number;
  team_plan_closed_orders: number;
  team_closed_orders: number;
  team_forecast_closed_orders: number;
  achievement_pct: number;
  forecast_achievement_pct: number;
  forecast_gap_pct: number;
  avg_deal_size: number;
  managers: SalesManagerRow[];
};

export type OwnerDashboardData = {
  summary: OwnerDashboardSummary;
  deadline_control: DeadlineControl;
  managers: OwnerManagerRow[];
  alerts: OwnerAlert[];
  reports: ManagerDailyReport[];
  productivity: ProductivitySnapshot;
  sales: SalesSnapshot;
};

function toDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value: string | null | undefined, fallback: Date) {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallback;
  const parsed = new Date(`${raw}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function addDays(date: Date, days: number) {
  const value = new Date(date.getTime());
  value.setDate(value.getDate() + days);
  return value;
}

function businessDaysInRange(from: Date, days: number) {
  let count = 0;
  for (let i = 0; i < days; i += 1) {
    const current = addDays(from, i);
    const day = current.getDay();
    if (day >= 1 && day <= 5) count += 1;
  }
  return count;
}

function getTaskDemandPoints(task: OrderTaskFactRow, asOfISO: string, asOfPlus2ISO: string, asOfPlus6ISO: string) {
  if (!task.is_active) return 0;
  if (!task.due_date) return 1;
  if (task.due_date <= asOfPlus6ISO) {
    return task.base_effort_points + (task.due_date <= asOfPlus2ISO ? 1 : 0);
  }
  if (task.due_date > asOfISO) {
    return task.base_effort_points * 0.5;
  }
  return task.base_effort_points;
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function riskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function recommendedAction(input: {
  workloadPct: number;
  overdueCount: number;
  due7Ratio: number;
  followupOverdueRatio: number;
  onTime30dPct: number | null;
  onTime30dSampleSize: number;
  noDeadlineRatio: number;
}) {
  if (input.workloadPct > 130) return "Reassign 2-3 due-soon tasks";
  if (input.overdueCount >= 6) return "Escalate overdue backlog + freeze new intake";
  if (input.due7Ratio > 0.5) return "Daily deadline checkpoint + rebalance this week";
  if (input.followupOverdueRatio > 0.4) return "Run follow-up cleanup block (30-60m/day)";
  if (input.onTime30dSampleSize >= 3 && input.onTime30dPct !== null && input.onTime30dPct < 70) {
    return "Reduce WIP and review planning discipline";
  }
  if (input.noDeadlineRatio > 0.3) return "Force deadlines for top active tasks";
  return "Monitor";
}

function uid(prefix: string, seed: string) {
  const safe = seed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 36);
  return `${prefix}_${safe}`;
}

function getTaskTitle(row: OrderLabelRow | undefined) {
  if (!row) return "Task";
  const fullName = String(row.full_name ?? "").trim();
  const parts = [String(row.first_name ?? "").trim(), String(row.last_name ?? "").trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  const clientName = fullName || parts || String(row.client_name ?? "").trim();
  const orderNumber = row.order_number !== null && row.order_number !== undefined
    ? `#${String(row.order_number)}`
    : "";
  if (orderNumber && clientName) return `Order ${orderNumber} - ${clientName}`;
  if (orderNumber) return `Order ${orderNumber}`;
  if (clientName) return clientName;
  return `Task ${row.id.slice(0, 8)}`;
}

function fallbackTaskTitle(taskId: string) {
  return `Task ${taskId.slice(0, 8)}`;
}

async function loadOrderLabels(
  admin: SupabaseClient,
  taskIds: string[],
) {
  if (!taskIds.length) return new Map<string, OrderLabelRow>();
  const attempts = [
    "id, order_number, client_name, full_name, first_name, last_name",
    "id, order_number, client_name",
    "id, client_name",
    "id",
  ];

  for (const selectColumns of attempts) {
    const { data, error } = await admin
      .from("orders")
      .select(selectColumns)
      .in("id", taskIds);

    if (error) continue;
    const map = new Map<string, OrderLabelRow>();
    for (const row of ((data ?? []) as Record<string, unknown>[])) {
      const id = String(row.id ?? "");
      if (!id) continue;
      map.set(id, {
        id,
        order_number: (row.order_number as string | number | null | undefined) ?? null,
        client_name: (row.client_name as string | null | undefined) ?? null,
        full_name: (row.full_name as string | null | undefined) ?? null,
        first_name: (row.first_name as string | null | undefined) ?? null,
        last_name: (row.last_name as string | null | undefined) ?? null,
      });
    }
    return map;
  }

  return new Map<string, OrderLabelRow>();
}

async function loadFollowupLabels(
  admin: SupabaseClient,
  businessId: string,
): Promise<Map<string, FollowupLabelRow>> {
  const { data, error } = await admin
    .from("follow_ups")
    .select("id,title,order_id")
    .eq("business_id", businessId);

  if (error) return new Map<string, FollowupLabelRow>();

  const map = new Map<string, FollowupLabelRow>();
  for (const row of (data ?? []) as FollowupLabelRow[]) {
    map.set(row.id, row);
  }
  return map;
}

export async function loadOwnerDashboardData(
  admin: SupabaseClient,
  input: {
    businessId: string;
    fromDate?: string | null;
    toDate?: string | null;
    asOfDate?: string | null;
    capacityPointsPerDay?: number;
    limitAlerts?: number;
    productivityPeriod?: ProductivityPeriod;
    reportFromDate?: string | null;
    reportToDate?: string | null;
    reportManagerId?: string | null;
    salesMonth?: string | null;
    salesManagerId?: string | null;
  },
): Promise<OwnerDashboardData> {
  const now = new Date();
  const asOf = parseDateOnly(input.asOfDate, now);
  const to = parseDateOnly(input.toDate, asOf);
  const from = parseDateOnly(input.fromDate, addDays(to, -29));

  const asOfISO = toDateOnly(asOf);
  const asOfPlus2ISO = toDateOnly(addDays(asOf, 2));
  const asOfPlus6ISO = toDateOnly(addDays(asOf, 6));
  const asOfMinus29ISO = toDateOnly(addDays(asOf, -29));
  const fromISO = toDateOnly(from);
  const toISO = toDateOnly(to);
  const capacityPointsPerDay = Number.isFinite(input.capacityPointsPerDay)
    ? Math.max(0, Number(input.capacityPointsPerDay))
    : 8;

  const reportFromDate = String(input.reportFromDate ?? "").trim();
  const reportToDate = String(input.reportToDate ?? "").trim();
  const reportManagerId = String(input.reportManagerId ?? "").trim();
  const salesMonthRaw = String(input.salesMonth ?? "").trim();
  const salesManagerId = String(input.salesManagerId ?? "").trim();
  const hasReportFromDate = /^\d{4}-\d{2}-\d{2}$/.test(reportFromDate);
  const hasReportToDate = /^\d{4}-\d{2}-\d{2}$/.test(reportToDate);
  const salesMonthDate = /^\d{4}-\d{2}-\d{2}$/.test(salesMonthRaw)
    ? parseDateOnly(salesMonthRaw, asOf)
    : new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  const salesMonthStart = toDateOnly(
    new Date(salesMonthDate.getFullYear(), salesMonthDate.getMonth(), 1),
  );
  const salesMonthEnd = toDateOnly(
    new Date(salesMonthDate.getFullYear(), salesMonthDate.getMonth() + 1, 0),
  );
  const salesDaysTotal = new Date(
    salesMonthDate.getFullYear(),
    salesMonthDate.getMonth() + 1,
    0,
  ).getDate();
  const todayISO = toDateOnly(now);
  const salesDaysElapsed =
    todayISO < salesMonthStart
      ? 0
      : todayISO > salesMonthEnd
        ? salesDaysTotal
        : Number(todayISO.slice(8, 10));
  const reportsQuery = admin
    .from("work_days")
    .select("id,business_id,user_id,work_date,status,started_at,finished_at,total_pause_seconds,daily_summary")
    .eq("business_id", input.businessId);
  if (hasReportFromDate) reportsQuery.gte("work_date", reportFromDate);
  if (hasReportToDate) reportsQuery.lte("work_date", reportToDate);
  if (reportManagerId) reportsQuery.eq("user_id", reportManagerId);

  const [
    tasksRes,
    followupsRes,
    rosterRes,
    capacityRes,
    reportsRes,
    salesOrdersRes,
    salesTargetsRes,
  ] = await Promise.all([
    admin
      .from("mv_owner_order_task_facts")
      .select("task_id,business_id,manager_id,status,due_date,closed_at,is_active,is_done,base_effort_points")
      .eq("business_id", input.businessId),
    admin
      .from("mv_owner_followup_facts")
      .select("followup_id,business_id,manager_id,status,due_date_effective,completed_at")
      .eq("business_id", input.businessId),
    admin
      .from("mv_owner_manager_roster")
      .select("business_id,manager_id,manager_name")
      .eq("business_id", input.businessId),
    admin
      .from("mv_owner_manager_capacity_baseline")
      .select("business_id,manager_id,daily_capacity_hours")
      .eq("business_id", input.businessId),
    reportsQuery
      .order("work_date", { ascending: false })
      .limit(120),
    admin
      .from("orders")
      .select("id,manager_id,amount,status,due_date,updated_at")
      .eq("business_id", input.businessId),
    admin
      .from("sales_month_targets")
      .select("business_id,manager_id,month_start,plan_amount,plan_closed_orders")
      .eq("business_id", input.businessId)
      .eq("month_start", salesMonthStart),
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (followupsRes.error) throw followupsRes.error;
  if (rosterRes.error) throw rosterRes.error;
  if (capacityRes.error) throw capacityRes.error;
  if (reportsRes.error) throw reportsRes.error;
  if (salesOrdersRes.error) throw salesOrdersRes.error;
  if (salesTargetsRes.error) throw salesTargetsRes.error;

  const tasks = (tasksRes.data ?? []) as OrderTaskFactRow[];
  const followups = (followupsRes.data ?? []) as FollowupFactRow[];
  const rosterRows = (rosterRes.data ?? []) as ManagerRosterRow[];
  const capacityRows = (capacityRes.data ?? []) as ManagerCapacityRow[];
  const reportsRows = (reportsRes.data ?? []) as Array<{
    id: string;
    business_id: string;
    user_id: string;
    work_date: string;
    status: string | null;
    started_at: string | null;
    finished_at: string | null;
    total_pause_seconds: number | null;
    daily_summary: string | null;
  }>;
  const salesOrders = (salesOrdersRes.data ?? []) as SalesOrderRow[];
  const salesTargets = (salesTargetsRes.data ?? []) as SalesTargetRow[];

  const managerNameById = new Map<string, string>();
  for (const row of rosterRows) {
    managerNameById.set(row.manager_id, row.manager_name);
  }

  for (const task of tasks) {
    if (!task.manager_id) continue;
    if (!managerNameById.has(task.manager_id)) {
      managerNameById.set(task.manager_id, task.manager_id);
    }
  }
  for (const target of salesTargets) {
    const managerId = String(target.manager_id ?? "").trim();
    if (!managerId) continue;
    if (!managerNameById.has(managerId)) {
      managerNameById.set(managerId, managerId);
    }
  }

  const managerIds = Array.from(managerNameById.keys());
  if (managerIds.length > 0) {
    const { data: profilesRows, error: profilesError } = await admin
      .from("profiles")
      .select("id,full_name,first_name,last_name,email")
      .in("id", managerIds);
    if (!profilesError) {
      for (const row of ((profilesRows ?? []) as Array<{
        id: string;
        full_name: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }>)) {
        const id = String(row.id ?? "").trim();
        if (!id) continue;
        const fullName = String(row.full_name ?? "").trim();
        const first = String(row.first_name ?? "").trim();
        const last = String(row.last_name ?? "").trim();
        const email = String(row.email ?? "").trim();
        const composed = [first, last].filter(Boolean).join(" ").trim();
        const pretty = fullName || composed || email;
        if (pretty) managerNameById.set(id, pretty);
      }
    }
  }

  const capacityByManager = new Map<string, number>();
  for (const row of capacityRows) {
    const parsed = Number(row.daily_capacity_hours);
    capacityByManager.set(row.manager_id, Number.isFinite(parsed) ? parsed : capacityPointsPerDay);
  }

  const businessDays7 = businessDaysInRange(asOf, 7);
  const activeTasks = tasks.filter((t) => t.is_active);
  const overdueTasks = activeTasks.filter((t) => Boolean(t.due_date && t.due_date < asOfISO));
  const due7Tasks = activeTasks.filter((t) => Boolean(t.due_date && t.due_date >= asOfISO && t.due_date <= asOfPlus6ISO));

  const doneInPeriodWithDeadline = tasks.filter((t) =>
    t.is_done &&
    Boolean(t.due_date) &&
    Boolean(t.closed_at && t.closed_at.slice(0, 10) >= fromISO && t.closed_at.slice(0, 10) <= toISO),
  );
  const doneOnTimeInPeriod = doneInPeriodWithDeadline.filter((t) => Boolean(t.closed_at && t.due_date && t.closed_at.slice(0, 10) <= t.due_date));

  const requiredPoints7d = activeTasks.reduce((sum, task) => (
    sum + getTaskDemandPoints(task, asOfISO, asOfPlus2ISO, asOfPlus6ISO)
  ), 0);

  const managersCount = managerIds.length;
  const availablePoints7d = managersCount * businessDays7 * capacityPointsPerDay;
  const teamWorkloadPct = availablePoints7d <= 0
    ? (requiredPoints7d > 0 ? 999 : 0)
    : Number(((requiredPoints7d / availablePoints7d) * 100).toFixed(2));

  const managerRows: OwnerManagerRow[] = managerIds.map((managerId) => {
    const managerTasks = tasks.filter((t) => t.manager_id === managerId);
    const managerActive = managerTasks.filter((t) => t.is_active);
    const managerOverdue = managerActive.filter((t) => Boolean(t.due_date && t.due_date < asOfISO));
    const managerDue7 = managerActive.filter((t) => Boolean(t.due_date && t.due_date >= asOfISO && t.due_date <= asOfPlus6ISO));
    const managerNoDeadline = managerActive.filter((t) => !t.due_date);

    const managerRequiredPoints7d = managerActive.reduce((sum, task) => (
      sum + getTaskDemandPoints(task, asOfISO, asOfPlus2ISO, asOfPlus6ISO)
    ), 0);

    const dailyCapacity = capacityByManager.get(managerId) ?? capacityPointsPerDay;
    const available = businessDays7 * dailyCapacity;
    const workloadPct = available <= 0
      ? (managerRequiredPoints7d > 0 ? 999 : 0)
      : Number(((managerRequiredPoints7d / available) * 100).toFixed(2));

    const managerDone30d = managerTasks.filter((t) => (
      t.is_done &&
      Boolean(t.due_date) &&
      Boolean(t.closed_at && t.closed_at.slice(0, 10) >= asOfMinus29ISO && t.closed_at.slice(0, 10) <= asOfISO)
    ));
    const managerDoneOnTime30d = managerDone30d.filter((t) => Boolean(t.closed_at && t.due_date && t.closed_at.slice(0, 10) <= t.due_date));
    const onTime30dPct = percent(managerDoneOnTime30d.length, managerDone30d.length);
    const onTime30dSampleSize = managerDone30d.length;

    const managerFollowups = followups.filter((f) => f.manager_id === managerId && f.status === "open");
    const overdueFollowups = managerFollowups.filter((f) => Boolean(f.due_date_effective && f.due_date_effective < asOfISO));
    const due7Ratio = managerActive.length > 0 ? managerDue7.length / managerActive.length : 0;
    const followupOverdueRatio = managerFollowups.length > 0 ? overdueFollowups.length / managerFollowups.length : 0;
    const noDeadlineRatio = managerActive.length > 0 ? managerNoDeadline.length / managerActive.length : 0;

    const overduePoints = managerOverdue.length >= 6 ? 50 : managerOverdue.length >= 3 ? 35 : managerOverdue.length >= 1 ? 20 : 0;
    const due7Points = due7Ratio > 0.5 ? 25 : due7Ratio > 0.3 ? 15 : 0;
    const workloadPoints = workloadPct > 130 ? 35 : workloadPct > 110 ? 20 : workloadPct >= 90 ? 10 : 0;
    const followupPoints = followupOverdueRatio > 0.4 ? 20 : followupOverdueRatio > 0.2 ? 10 : 0;
    const ontimePoints = onTime30dSampleSize < 3
      ? 0
      : onTime30dPct === null
        ? 0
        : onTime30dPct < 70
          ? 20
          : onTime30dPct < 85
            ? 10
            : 0;
    const noDeadlinePoints = noDeadlineRatio > 0.3 ? 10 : 0;
    const riskScore = Math.min(100, overduePoints + due7Points + workloadPoints + followupPoints + ontimePoints + noDeadlinePoints);

    const breakdown: RiskBreakdown = {
      overdue_points: overduePoints,
      due7_points: due7Points,
      workload_points: workloadPoints,
      followup_points: followupPoints,
      ontime_points: ontimePoints,
      no_deadline_points: noDeadlinePoints,
      inputs: {
        overdue_count: managerOverdue.length,
        due_7d_ratio: Number(due7Ratio.toFixed(4)),
        workload_pct: workloadPct,
        followup_overdue_ratio: Number(followupOverdueRatio.toFixed(4)),
        on_time_30d_pct: onTime30dPct,
        on_time_30d_sample_size: onTime30dSampleSize,
        no_deadline_ratio: Number(noDeadlineRatio.toFixed(4)),
      },
    };

    return {
      manager_id: managerId,
      manager_name: managerNameById.get(managerId) ?? managerId,
      active_tasks: managerActive.length,
      overdue: managerOverdue.length,
      due_7d: managerDue7.length,
      workload_pct: workloadPct,
      on_time_pct_30d: onTime30dPct,
      overdue_followups: overdueFollowups.length,
      risk_score: riskScore,
      risk_level: riskLevel(riskScore),
      risk_breakdown: breakdown,
      recommended_action: recommendedAction({
        workloadPct,
        overdueCount: managerOverdue.length,
        due7Ratio,
        followupOverdueRatio,
        onTime30dPct,
        onTime30dSampleSize,
        noDeadlineRatio,
      }),
    };
  }).sort((a, b) => b.risk_score - a.risk_score || b.workload_pct - a.workload_pct || b.overdue - a.overdue);

  const allTaskIds = Array.from(new Set(tasks.map((task) => task.task_id))).slice(0, 1000);
  const labelsByTaskId = await loadOrderLabels(admin, allTaskIds);
  const followupLabelsById = await loadFollowupLabels(admin, input.businessId);

  const topOverdueTasks: DeadlineControl["top_overdue_tasks"] = overdueTasks
    .slice()
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 20)
    .map((task) => {
      const daysOverdue = task.due_date
        ? Math.max(1, Math.floor((Date.parse(`${asOfISO}T00:00:00`) - Date.parse(`${task.due_date}T00:00:00`)) / 86_400_000))
        : 0;
      return {
        task_id: task.task_id,
        task_title: getTaskTitle(labelsByTaskId.get(task.task_id)),
        manager_id: task.manager_id,
        manager_name: task.manager_id ? (managerNameById.get(task.manager_id) ?? task.manager_id) : "Unassigned",
        days_overdue: daysOverdue,
        recommended_action: daysOverdue >= 7
          ? "Contact manager today and set unblock plan"
          : daysOverdue >= 3
            ? "Reassign or unblock today"
            : "Push completion by EOD",
      };
    });

  const summary: OwnerDashboardSummary = {
    active_tasks: activeTasks.length,
    overdue_tasks: overdueTasks.length,
    due_7d: due7Tasks.length,
    on_time_completion_pct: percent(doneOnTimeInPeriod.length, doneInPeriodWithDeadline.length),
    team_workload_pct: teamWorkloadPct,
    managers_at_risk: managerRows.filter((m) => m.risk_score >= 60).length,
    generated_at: new Date().toISOString(),
  };

  const deadlineControl: DeadlineControl = {
    traffic_bar: {
      on_track: activeTasks.filter((t) => Boolean(t.due_date && t.due_date > asOfPlus6ISO)).length,
      at_risk: activeTasks.filter((t) => Boolean(t.due_date && t.due_date >= asOfISO && t.due_date <= asOfPlus6ISO)).length,
      overdue: overdueTasks.length,
      no_deadline: activeTasks.filter((t) => !t.due_date).length,
    },
    top_overdue_tasks: topOverdueTasks,
  };

  const alerts: OwnerAlert[] = [];
  for (const manager of managerRows) {
    if (manager.workload_pct >= 110) {
      alerts.push({
        alert_id: uid("manager_overload", manager.manager_id),
        created_at: new Date().toISOString(),
        scope: "manager",
        scope_id: manager.manager_id,
        problem: "Manager overload",
        reason: `Workload ${manager.workload_pct}%`,
        recommended_action: "Reassign 2-3 due-soon tasks",
        severity: manager.workload_pct > 130 ? "critical" : "high",
        status: "new",
      });
    }
    if (manager.overdue >= 3) {
      alerts.push({
        alert_id: uid("manager_overdue", manager.manager_id),
        created_at: new Date().toISOString(),
        scope: "manager",
        scope_id: manager.manager_id,
        problem: "High overdue backlog",
        reason: `Overdue tasks: ${manager.overdue}`,
        recommended_action: "Review overdue list with manager and pause new intake for 2-3 days",
        severity: manager.overdue >= 6 ? "critical" : "high",
        status: "new",
      });
    }
  }

  for (const task of topOverdueTasks.slice(0, 10)) {
    alerts.push({
      alert_id: uid("task_overdue", task.task_id),
      created_at: new Date().toISOString(),
      scope: "task",
      scope_id: task.task_id,
      problem: "Task overdue",
      reason: `Overdue by ${task.days_overdue} days`,
      recommended_action: task.days_overdue >= 7
        ? "Contact manager today and set unblock plan"
        : "Assign unblock owner and close by EOD",
      severity: task.days_overdue >= 7 ? "critical" : task.days_overdue >= 3 ? "high" : "medium",
      status: "new",
    });
  }

  alerts.sort((a, b) => {
    const rank = (value: OwnerAlert["severity"]) => (value === "critical" ? 3 : value === "high" ? 2 : 1);
    return rank(b.severity) - rank(a.severity);
  });

  const reports: ManagerDailyReport[] = reportsRows
    .filter((row) => {
      const status = String(row.status ?? "").toLowerCase();
      return status === "finished" || Boolean(String(row.daily_summary ?? "").trim());
    })
    .map((row) => {
      const reportDate = row.work_date;
      const tomorrowDate = toDateOnly(addDays(new Date(`${reportDate}T00:00:00`), 1));
      const managerId = row.user_id;

      let trackedHours: number | null = null;
      let inWorkHours: number | null = null;
      let pausedHours: number | null = null;
      if (row.started_at && row.finished_at) {
        const started = Date.parse(row.started_at);
        const finished = Date.parse(row.finished_at);
        if (Number.isFinite(started) && Number.isFinite(finished) && finished >= started) {
          const totalSeconds = Math.max(0, Math.floor((finished - started) / 1000));
          const pauseSeconds = Math.max(0, row.total_pause_seconds ?? 0);
          const seconds = Math.max(0, totalSeconds - pauseSeconds);
          inWorkHours = Number((totalSeconds / 3600).toFixed(2));
          pausedHours = Number((pauseSeconds / 3600).toFixed(2));
          trackedHours = Number((seconds / 3600).toFixed(2));
        }
      } else if (row.total_pause_seconds !== null && row.total_pause_seconds !== undefined) {
        pausedHours = Number((Math.max(0, row.total_pause_seconds) / 3600).toFixed(2));
      }

      const completedTodayTasks = tasks.filter((task) => (
        task.manager_id === managerId &&
        task.is_done &&
        Boolean(task.closed_at && task.closed_at.slice(0, 10) === reportDate)
      ));

      const tomorrowTasks = tasks.filter((task) => (
        task.manager_id === managerId &&
        task.is_active &&
        task.due_date === tomorrowDate
      ));

      const tomorrowFollowups = followups.filter((followup) => (
        followup.manager_id === managerId &&
        followup.status === "open" &&
        followup.due_date_effective === tomorrowDate
      ));

      const completedTodayItems = completedTodayTasks.map((task) => ({
        label: getTaskTitle(labelsByTaskId.get(task.task_id)) || fallbackTaskTitle(task.task_id),
        href: task.task_id,
      }));
      const tomorrowTaskItems = tomorrowTasks.map((task) => ({
        label: getTaskTitle(labelsByTaskId.get(task.task_id)) || fallbackTaskTitle(task.task_id),
        href: task.task_id,
      }));
      const tomorrowFollowupItems = tomorrowFollowups.map((followup) => {
        const labelRow = followupLabelsById.get(followup.followup_id);
        const title = String(labelRow?.title ?? "").trim();
        return {
          label: title || `Follow-up ${followup.followup_id.slice(0, 8)}`,
          href: labelRow?.order_id ?? null,
        };
      });

      return {
        report_id: row.id,
        manager_id: managerId,
        manager_name: managerNameById.get(managerId) ?? managerId,
        work_date: row.work_date,
        status: String(row.status ?? "unknown"),
        started_at: row.started_at,
        finished_at: row.finished_at,
        tracked_hours: trackedHours,
        in_work_hours: inWorkHours,
        paused_hours: pausedHours,
        daily_summary: row.daily_summary,
        completed_today_count: completedTodayItems.length,
        completed_today_items: completedTodayItems.slice(0, 20),
        tomorrow_plan_count: tomorrowTaskItems.length + tomorrowFollowupItems.length,
        tomorrow_plan_items: [...tomorrowTaskItems, ...tomorrowFollowupItems].slice(0, 30),
      };
    })
    .sort((a, b) => b.work_date.localeCompare(a.work_date))
    .slice(0, 20);

  const productivityPeriod: ProductivityPeriod = input.productivityPeriod ?? "week";
  const productivityEnd = asOfISO;
  const productivityStart =
    productivityPeriod === "day"
      ? asOfISO
      : productivityPeriod === "week"
        ? toDateOnly(addDays(asOf, -6))
        : toDateOnly(new Date(asOf.getFullYear(), asOf.getMonth(), 1));

  const isClosedStatus = (status: string | null | undefined) => {
    const normalized = String(status ?? "")
      .trim()
      .toUpperCase();
    return normalized === "DONE" || normalized === "CLOSED";
  };

  const inSalesMonth = (value: string | null | undefined) => {
    const date = String(value ?? "").slice(0, 10);
    return Boolean(date && date >= salesMonthStart && date <= salesMonthEnd);
  };

  const parseAmount = (value: number | string | null | undefined) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const parseCount = (value: number | string | null | undefined) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  };

  const salesPeriodOrders = salesOrders.filter((order) =>
    inSalesMonth(order.due_date),
  );
  const salesClosedOrders = salesOrders.filter(
    (order) => isClosedStatus(order.status) && inSalesMonth(order.updated_at),
  );
  const includedManagerIdsFromTargets = Array.from(
    new Set(
      salesTargets
        .map((row) => String(row.manager_id ?? "").trim())
        .filter(Boolean),
    ),
  );
  const hasSalesTargetData = includedManagerIdsFromTargets.length > 0;

  const productivityManagers: ProductivityManagerRow[] = managerIds.map((managerId) => {
    const managerClosedOrders = tasks.filter((task) => (
      task.manager_id === managerId &&
      task.is_done &&
      Boolean(task.closed_at && task.closed_at.slice(0, 10) >= productivityStart && task.closed_at.slice(0, 10) <= productivityEnd)
    )).length;

    const managerClosedFollowups = followups.filter((followup) => (
      followup.manager_id === managerId &&
      followup.status === "done" &&
      Boolean(
        followup.completed_at &&
        followup.completed_at.slice(0, 10) >= productivityStart &&
        followup.completed_at.slice(0, 10) <= productivityEnd,
      )
    )).length;

    return {
      manager_id: managerId,
      manager_name: managerNameById.get(managerId) ?? managerId,
      closed_orders: managerClosedOrders,
      closed_followups: managerClosedFollowups,
      total_closed: managerClosedOrders + managerClosedFollowups,
    };
  }).sort((a, b) => b.total_closed - a.total_closed || b.closed_orders - a.closed_orders);

  const productivity: ProductivitySnapshot = {
    period: productivityPeriod,
    start_date: productivityStart,
    end_date: productivityEnd,
    team_closed_orders: productivityManagers.reduce((sum, m) => sum + m.closed_orders, 0),
    team_closed_followups: productivityManagers.reduce((sum, m) => sum + m.closed_followups, 0),
    team_total_closed: productivityManagers.reduce((sum, m) => sum + m.total_closed, 0),
    managers: productivityManagers,
  };

  const scopedSalesManagerIds = salesManagerId
    ? (hasSalesTargetData
        ? includedManagerIdsFromTargets.filter(
            (managerId) => managerId === salesManagerId,
          )
        : managerIds.filter((managerId) => managerId === salesManagerId))
    : (hasSalesTargetData ? includedManagerIdsFromTargets : managerIds);

  const salesManagers: SalesManagerRow[] = scopedSalesManagerIds
    .map((managerId) => {
      const managerTargetRows = salesTargets.filter(
        (row) => row.manager_id === managerId,
      );
      const managerPlanAmount = managerTargetRows.reduce(
        (sum, row) => sum + parseAmount(row.plan_amount),
        0,
      );
      const managerPlanClosedOrders = managerTargetRows.reduce(
        (sum, row) => sum + parseCount(row.plan_closed_orders),
        0,
      );
      const managerClosed = salesClosedOrders.filter(
        (order) => order.manager_id === managerId,
      );
      const managerActualAmount = managerClosed.reduce(
        (sum, order) => sum + parseAmount(order.amount),
        0,
      );
      const managerClosedOrders = managerClosed.length;
      const fallbackManagerPlanAmount =
        !hasSalesTargetData
          ? salesPeriodOrders
              .filter((order) => order.manager_id === managerId)
              .reduce((sum, order) => sum + parseAmount(order.amount), 0)
          : 0;
      const effectiveManagerPlanAmount =
        hasSalesTargetData
          ? managerPlanAmount
          : managerPlanAmount > 0
            ? managerPlanAmount
            : fallbackManagerPlanAmount;
      const managerAchievement =
        effectiveManagerPlanAmount > 0
          ? Number(((managerActualAmount / effectiveManagerPlanAmount) * 100).toFixed(2))
          : 0;
      const managerForecastAmount =
        salesDaysElapsed > 0
          ? Number(((managerActualAmount / salesDaysElapsed) * salesDaysTotal).toFixed(2))
          : 0;
      const managerForecastClosedOrders =
        salesDaysElapsed > 0
          ? Number(((managerClosedOrders / salesDaysElapsed) * salesDaysTotal).toFixed(2))
          : 0;
      const managerForecastAchievementPct =
        effectiveManagerPlanAmount > 0
          ? Number(((managerForecastAmount / effectiveManagerPlanAmount) * 100).toFixed(2))
          : 0;
      const managerForecastGapPct = Number((managerForecastAchievementPct - 100).toFixed(2));

      return {
        manager_id: managerId,
        manager_name: managerNameById.get(managerId) ?? managerId,
        planned_amount: Number(effectiveManagerPlanAmount.toFixed(2)),
        actual_amount: Number(managerActualAmount.toFixed(2)),
        forecast_amount: managerForecastAmount,
        plan_closed_orders: managerPlanClosedOrders,
        closed_orders: managerClosedOrders,
        forecast_closed_orders: managerForecastClosedOrders,
        achievement_pct: managerAchievement,
        forecast_achievement_pct: managerForecastAchievementPct,
        forecast_gap_pct: managerForecastGapPct,
      };
    })
    .sort((a, b) => b.actual_amount - a.actual_amount);

  const teamPlanAmountRaw = salesManagers.reduce(
    (sum, manager) => sum + manager.planned_amount,
    0,
  );
  const teamActualAmountRaw = salesManagers.reduce(
    (sum, manager) => sum + manager.actual_amount,
    0,
  );
  const teamForecastAmount = salesManagers.reduce(
    (sum, manager) => sum + manager.forecast_amount,
    0,
  );
  const teamPlanClosedOrders = salesManagers.reduce(
    (sum, manager) => sum + manager.plan_closed_orders,
    0,
  );
  const teamClosedOrders = salesManagers.reduce(
    (sum, manager) => sum + manager.closed_orders,
    0,
  );
  const teamForecastClosedOrders = salesManagers.reduce(
    (sum, manager) => sum + manager.forecast_closed_orders,
    0,
  );
  const effectiveTeamPlanAmount = teamPlanAmountRaw;
  const teamAchievementPct =
    effectiveTeamPlanAmount > 0
      ? Number(((teamActualAmountRaw / effectiveTeamPlanAmount) * 100).toFixed(2))
      : 0;
  const teamForecastAchievementPct =
    effectiveTeamPlanAmount > 0
      ? Number(((teamForecastAmount / effectiveTeamPlanAmount) * 100).toFixed(2))
      : 0;
  const teamForecastGapPct = Number((teamForecastAchievementPct - 100).toFixed(2));
  const avgDealSize =
    teamClosedOrders > 0
      ? Number((teamActualAmountRaw / teamClosedOrders).toFixed(2))
      : 0;

  const sales: SalesSnapshot = {
    period: "month",
    start_date: salesMonthStart,
    end_date: salesMonthEnd,
    days_elapsed: salesDaysElapsed,
    days_total: salesDaysTotal,
    selected_manager_id: salesManagerId || null,
    team_plan_amount: Number(effectiveTeamPlanAmount.toFixed(2)),
    team_actual_amount: Number(teamActualAmountRaw.toFixed(2)),
    team_forecast_amount: teamForecastAmount,
    team_plan_closed_orders: teamPlanClosedOrders,
    team_closed_orders: teamClosedOrders,
    team_forecast_closed_orders: teamForecastClosedOrders,
    achievement_pct: teamAchievementPct,
    forecast_achievement_pct: teamForecastAchievementPct,
    forecast_gap_pct: teamForecastGapPct,
    avg_deal_size: avgDealSize,
    managers: salesManagers,
  };

  return {
    summary,
    deadline_control: deadlineControl,
    managers: managerRows,
    alerts: alerts.slice(0, Math.max(1, input.limitAlerts ?? 100)),
    reports,
    productivity,
    sales,
  };
}
