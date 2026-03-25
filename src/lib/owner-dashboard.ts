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

export type OwnerDashboardData = {
  summary: OwnerDashboardSummary;
  deadline_control: DeadlineControl;
  managers: OwnerManagerRow[];
  alerts: OwnerAlert[];
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

function betweenDateOnly(value: string | null, from: string, to: string) {
  if (!value) return false;
  return value >= from && value <= to;
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

export async function loadOwnerDashboardData(
  admin: SupabaseClient,
  input: {
    businessId: string;
    fromDate?: string | null;
    toDate?: string | null;
    asOfDate?: string | null;
    capacityPointsPerDay?: number;
    limitAlerts?: number;
  },
): Promise<OwnerDashboardData> {
  const now = new Date();
  const asOf = parseDateOnly(input.asOfDate, now);
  const to = parseDateOnly(input.toDate, asOf);
  const from = parseDateOnly(input.fromDate, addDays(to, -29));

  const asOfISO = toDateOnly(asOf);
  const asOfPlus2ISO = toDateOnly(addDays(asOf, 2));
  const asOfPlus6ISO = toDateOnly(addDays(asOf, 6));
  const fromISO = toDateOnly(from);
  const toISO = toDateOnly(to);
  const capacityPointsPerDay = Number.isFinite(input.capacityPointsPerDay)
    ? Math.max(0, Number(input.capacityPointsPerDay))
    : 8;

  const [tasksRes, followupsRes, rosterRes, capacityRes] = await Promise.all([
    admin
      .from("mv_owner_order_task_facts")
      .select("task_id,business_id,manager_id,status,due_date,closed_at,is_active,is_done,base_effort_points")
      .eq("business_id", input.businessId),
    admin
      .from("mv_owner_followup_facts")
      .select("followup_id,business_id,manager_id,status,due_date_effective")
      .eq("business_id", input.businessId),
    admin
      .from("mv_owner_manager_roster")
      .select("business_id,manager_id,manager_name")
      .eq("business_id", input.businessId),
    admin
      .from("mv_owner_manager_capacity_baseline")
      .select("business_id,manager_id,daily_capacity_hours")
      .eq("business_id", input.businessId),
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (followupsRes.error) throw followupsRes.error;
  if (rosterRes.error) throw rosterRes.error;
  if (capacityRes.error) throw capacityRes.error;

  const tasks = (tasksRes.data ?? []) as OrderTaskFactRow[];
  const followups = (followupsRes.data ?? []) as FollowupFactRow[];
  const rosterRows = (rosterRes.data ?? []) as ManagerRosterRow[];
  const capacityRows = (capacityRes.data ?? []) as ManagerCapacityRow[];

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

  const managerIds = Array.from(managerNameById.keys());
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
      Boolean(t.closed_at && t.closed_at.slice(0, 10) >= toDateOnly(addDays(asOf, -29)) && t.closed_at.slice(0, 10) <= asOfISO)
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

  const overdueTaskIds = overdueTasks
    .slice()
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 20)
    .map((t) => t.task_id);
  const labelsByTaskId = await loadOrderLabels(admin, overdueTaskIds);

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
          ? "Escalate today"
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
        recommended_action: "Escalate overdue tasks and freeze new intake for 2-3 days",
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
        ? "Escalate today"
        : "Assign unblock owner and close by EOD",
      severity: task.days_overdue >= 7 ? "critical" : task.days_overdue >= 3 ? "high" : "medium",
      status: "new",
    });
  }

  alerts.sort((a, b) => {
    const rank = (value: OwnerAlert["severity"]) => (value === "critical" ? 3 : value === "high" ? 2 : 1);
    return rank(b.severity) - rank(a.severity);
  });

  return {
    summary,
    deadline_control: deadlineControl,
    managers: managerRows,
    alerts: alerts.slice(0, Math.max(1, input.limitAlerts ?? 100)),
  };
}
