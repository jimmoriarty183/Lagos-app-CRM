import type { OwnerDashboardData } from "@/lib/owner-dashboard";

type Props = {
  data: OwnerDashboardData;
  businessSlug?: string;
  phoneRaw?: string;
  view?: "overview" | "managers" | "alerts" | "reports" | "productivity";
  managerBaseHref?: string;
  reportFilter?: {
    fromDate?: string;
    toDate?: string;
    managerId?: string;
  };
  productivityHrefs?: {
    day: string;
    week: string;
    month: string;
  };
};

type AnalyticsView = NonNullable<Props["view"]>;

const VIEW_META: Record<
  AnalyticsView,
  { label: string; helpTitle: string; helpPoints: string[] }
> = {
  overview: {
    label: "Overview",
    helpTitle: "How to read Overview",
    helpPoints: [
      "Start with Overdue Tasks, Due in 7 Days, and Team Workload.",
      "In Deadline Control, red = overdue, yellow = near deadline risk.",
      "Use Top Overdue Tasks to open orders and resolve blockers today.",
    ],
  },
  managers: {
    label: "Managers",
    helpTitle: "How to read Managers",
    helpPoints: [
      "Risk is a 0-100 score; focus on the highest rows first.",
      "Open details to see what drives risk: overdue, workload, follow-ups.",
      "Use Action to align priorities and rebalance tasks.",
    ],
  },
  alerts: {
    label: "Alerts",
    helpTitle: "How to process Alerts",
    helpPoints: [
      "Treat this as today's execution queue.",
      "Open manager or order directly from each alert card.",
      "Set unblock owner, deadline, and confirm who is responsible.",
    ],
  },
  reports: {
    label: "Reports",
    helpTitle: "How to read Reports",
    helpPoints: [
      "Reports summarize manager end-of-day execution.",
      "In Work = from Start Day to End Day; Tracked = In Work - Paused.",
      "Use Done Today and Tomorrow Plan to verify planning quality.",
    ],
  },
  productivity: {
    label: "Productivity",
    helpTitle: "How to read Productivity",
    helpPoints: [
      "Compare closed Orders and Follow-ups for the selected period.",
      "Check manager distribution, not just total team volume.",
      "Use period switch to detect dips and spikes in output.",
    ],
  },
};

function formatPercent(value: number | null) {
  if (value === null) return "N/A";
  return `${value.toFixed(1)}%`;
}

function formatHours(value: number | null) {
  if (value === null) return "N/A";
  const totalMinutes = Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatDayTime(value: string | null) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ReportTimeFlag = {
  label: string;
  toneClass: string;
};

function getReportTimeFlag(input: {
  trackedHours: number | null;
  inWorkHours: number | null;
  pausedHours: number | null;
}): ReportTimeFlag | null {
  const inWork = input.inWorkHours ?? 0;
  const paused = input.pausedHours ?? 0;
  const tracked = input.trackedHours ?? 0;
  if (inWork <= 0) return null;

  const pauseRatio = paused / inWork;
  if (tracked <= 0.01) {
    return {
      label: "Zero tracked with in-work time",
      toneClass: "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]",
    };
  }
  if (pauseRatio >= 0.8) {
    return {
      label: "High pause (>=80%)",
      toneClass: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]",
    };
  }
  return null;
}

function toneClass(
  value: number,
  highThreshold: number,
  mediumThreshold: number,
) {
  if (value >= highThreshold) return "text-[#b42318]";
  if (value >= mediumThreshold) return "text-[#b54708]";
  return "text-[#067647]";
}

function managerLabel(value: string) {
  const text = String(value ?? "").trim();
  const uuidLike = /^[0-9a-f-]{20,}$/i.test(text);
  if (!uuidLike) return text || "Manager";
  return `Manager ${text.slice(0, 8)}`;
}

function formatRatio(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildOrderHref(
  orderId: string,
  businessSlug?: string,
  phoneRaw?: string,
) {
  if (!businessSlug) return null;
  const params = new URLSearchParams();
  params.set("focusOrder", orderId);
  if (phoneRaw) params.set("u", phoneRaw);
  return `/b/${businessSlug}?${params.toString()}`;
}

export default function OwnerAnalyticsPanel({
  data,
  businessSlug,
  phoneRaw,
  view = "overview",
  managerBaseHref,
  reportFilter,
  productivityHrefs,
}: Props) {
  const totalTraffic = Math.max(
    1,
    data.deadline_control.traffic_bar.on_track +
      data.deadline_control.traffic_bar.at_risk +
      data.deadline_control.traffic_bar.overdue,
  );

  const onTrackWidth =
    (data.deadline_control.traffic_bar.on_track / totalTraffic) * 100;
  const atRiskWidth =
    (data.deadline_control.traffic_bar.at_risk / totalTraffic) * 100;
  const overdueWidth =
    (data.deadline_control.traffic_bar.overdue / totalTraffic) * 100;
  const tableManagers = data.managers;
  const showOverview = view === "overview";
  const showManagers = view === "managers";
  const showAlerts = view === "alerts";
  const showReports = view === "reports";
  const showProductivity = view === "productivity";
  const currentViewMeta = VIEW_META[view];
  const managerNameById = new Map(
    data.managers.map((item) => [item.manager_id, item.manager_name]),
  );
  const reportManagerOptions = data.managers
    .slice()
    .sort((a, b) =>
      managerLabel(a.manager_name).localeCompare(managerLabel(b.manager_name)),
    )
    .map((manager) => ({
      id: manager.manager_id,
      name: managerLabel(manager.manager_name),
    }));
  const hasReportFilter =
    Boolean(String(reportFilter?.fromDate ?? "").trim()) ||
    Boolean(String(reportFilter?.toDate ?? "").trim()) ||
    Boolean(String(reportFilter?.managerId ?? "").trim());
  const resetReportsHref = businessSlug
    ? phoneRaw
      ? `/b/${businessSlug}/analytics?u=${encodeURIComponent(phoneRaw)}&tab=reports`
      : `/b/${businessSlug}/analytics?tab=reports`
    : "#";
  const buildManagerHref = (managerId: string) => {
    if (!managerBaseHref) return null;
    return `${managerBaseHref}#manager-${encodeURIComponent(managerId)}`;
  };

  const getAlertAction = (alert: OwnerDashboardData["alerts"][number]) => {
    if (alert.scope === "manager") {
      const href = buildManagerHref(alert.scope_id);
      const managerName = managerNameById.get(alert.scope_id);
      return {
        href,
        linkLabel: managerName
          ? `Open manager: ${managerLabel(managerName)}`
          : "Open manager details",
        note: "Align priorities with manager and rebalance workload today.",
      };
    }

    if (alert.scope === "task") {
      const href = buildOrderHref(alert.scope_id, businessSlug, phoneRaw);
      return {
        href,
        linkLabel: "Open order",
        note: "Set an unblock owner and confirm completion deadline.",
      };
    }

    return {
      href: null,
      linkLabel: "",
      note: "Review team queue and assign next steps.",
    };
  };

  return (
    <section
      id="owner-analytics"
      className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[#6B7280]">
            Owner Analytics / {currentViewMeta.label}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#111827]">
              {currentViewMeta.label}
            </h2>
            <details className="relative">
              <summary
                className="inline-flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full border border-[#D0D5DD] bg-white text-[11px] font-semibold text-[#475467] transition hover:border-[#98A2B3] hover:text-[#111827]"
                aria-label={`${currentViewMeta.label} help`}
                title={`${currentViewMeta.label} help`}
              >
                ?
              </summary>
              <div className="absolute left-0 top-7 z-20 w-[340px] rounded-xl border border-[#E5E7EB] bg-white p-3 text-xs text-[#344054] shadow-[0_12px_24px_rgba(16,24,40,0.12)]">
                <div className="text-sm font-semibold text-[#111827]">
                  {currentViewMeta.helpTitle}
                </div>
                <ul className="mt-2 space-y-1">
                  {currentViewMeta.helpPoints.map((point, idx) => (
                    <li key={`${view}-help-${idx}`}>
                      {idx + 1}. {point}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          </div>
        </div>
        <span className="text-xs text-[#6B7280]">
          Updated: {new Date(data.summary.generated_at).toLocaleString("en-US")}
        </span>
      </div>

      {showOverview ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-xl border border-[#E5E7EB] p-3">
            <div className="text-xs font-medium text-[#6B7280]">
              Active Tasks
            </div>
            <div className="mt-1 text-2xl font-semibold text-[#111827]">
              {data.summary.active_tasks}
            </div>
          </article>
          <article className="rounded-xl border border-[#E5E7EB] p-3">
            <div className="text-xs font-medium text-[#6B7280]">
              Overdue Tasks
            </div>
            <div
              className={`mt-1 text-2xl font-semibold ${toneClass(data.summary.overdue_tasks, 6, 1)}`}
            >
              {data.summary.overdue_tasks}
            </div>
          </article>
          <article className="rounded-xl border border-[#E5E7EB] p-3">
            <div className="text-xs font-medium text-[#6B7280]">
              Due in 7 Days
            </div>
            <div className="mt-1 text-2xl font-semibold text-[#111827]">
              {data.summary.due_7d}
            </div>
          </article>
          <article className="rounded-xl border border-[#E5E7EB] p-3">
            <div className="text-xs font-medium text-[#6B7280]">
              On-Time Completion
            </div>
            <div className="mt-1 text-2xl font-semibold text-[#111827]">
              {formatPercent(data.summary.on_time_completion_pct)}
            </div>
          </article>
          <article className="rounded-xl border border-[#E5E7EB] p-3">
            <div className="text-xs font-medium text-[#6B7280]">
              Team Workload
            </div>
            <div
              className={`mt-1 text-2xl font-semibold ${toneClass(data.summary.team_workload_pct, 130, 90)}`}
            >
              {formatPercent(data.summary.team_workload_pct)}
            </div>
          </article>
          <article className="rounded-xl border border-[#E5E7EB] p-3">
            <div className="text-xs font-medium text-[#6B7280]">
              Managers At Risk
            </div>
            <div
              className={`mt-1 text-2xl font-semibold ${toneClass(data.summary.managers_at_risk, 3, 1)}`}
            >
              {data.summary.managers_at_risk}
            </div>
          </article>
        </div>
      ) : null}

      {showOverview ? (
        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="mb-2 text-sm font-semibold text-[#111827]">
            Deadline Control (7 days)
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
            <div className="flex h-full">
              <div
                className="bg-[#16a34a]"
                style={{ width: `${onTrackWidth}%` }}
              />
              <div
                className="bg-[#f59e0b]"
                style={{ width: `${atRiskWidth}%` }}
              />
              <div
                className="bg-[#dc2626]"
                style={{ width: `${overdueWidth}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#4B5563]">
            <span>On Track: {data.deadline_control.traffic_bar.on_track}</span>
            <span>At Risk: {data.deadline_control.traffic_bar.at_risk}</span>
            <span>Overdue: {data.deadline_control.traffic_bar.overdue}</span>
            <span>
              No Deadline: {data.deadline_control.traffic_bar.no_deadline}
            </span>
          </div>
        </article>
      ) : null}

      {showManagers ? (
        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="mb-2 text-sm font-semibold text-[#111827]">
            Manager Table
          </div>
          <p className="mb-2 text-xs text-[#6B7280]">
            `Risk` shows the total score (0–100). Open `details` to see the
            exact drivers: overdue tasks, tasks due in 7 days, workload, overdue
            follow-ups, on-time performance, and tasks without deadlines.
          </p>
          <p className="mb-2 text-xs text-[#6B7280]">
            Managers shown: {tableManagers.length}
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] text-[#4B5563]">
                <tr>
                  <th className="px-2 py-2">Manager</th>
                  <th className="px-2 py-2">Active</th>
                  <th className="px-2 py-2">Overdue</th>
                  <th className="px-2 py-2">Due 7d</th>
                  <th className="px-2 py-2">Workload</th>
                  <th className="px-2 py-2">On-Time 30d</th>
                  <th className="px-2 py-2">Risk</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {tableManagers.map((manager) => (
                  <tr
                    id={`manager-${manager.manager_id}`}
                    key={manager.manager_id}
                    className="border-t border-[#E5E7EB]"
                  >
                    <td className="px-2 py-2 font-medium text-[#111827]">
                      {managerLabel(manager.manager_name)}
                    </td>
                    <td className="px-2 py-2">{manager.active_tasks}</td>
                    <td className="px-2 py-2">{manager.overdue}</td>
                    <td className="px-2 py-2">{manager.due_7d}</td>
                    <td
                      className={`px-2 py-2 ${toneClass(manager.workload_pct, 130, 90)}`}
                    >
                      {formatPercent(manager.workload_pct)}
                    </td>
                    <td className="px-2 py-2">
                      {formatPercent(manager.on_time_pct_30d)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <span className={toneClass(manager.risk_score, 60, 30)}>
                          {manager.risk_score}
                        </span>
                        <details>
                          <summary className="cursor-pointer text-[var(--brand-600)]">
                            details
                          </summary>
                          <div className="mt-2 w-[320px] rounded-lg bg-[#F9FAFB] p-2 text-[11px] text-[#374151]">
                            <div className="font-semibold text-[#111827]">
                              Score breakdown
                            </div>
                            <ul className="mt-1 space-y-1">
                              <li>
                                Overdue points:{" "}
                                {manager.risk_breakdown.overdue_points}
                              </li>
                              <li>
                                Due 7d points:{" "}
                                {manager.risk_breakdown.due7_points}
                              </li>
                              <li>
                                Workload points:{" "}
                                {manager.risk_breakdown.workload_points}
                              </li>
                              <li>
                                Follow-up points:{" "}
                                {manager.risk_breakdown.followup_points}
                              </li>
                              <li>
                                On-time points:{" "}
                                {manager.risk_breakdown.ontime_points}
                              </li>
                              <li>
                                No-deadline points:{" "}
                                {manager.risk_breakdown.no_deadline_points}
                              </li>
                            </ul>
                            <div className="mt-2 font-semibold text-[#111827]">
                              Inputs
                            </div>
                            <ul className="mt-1 space-y-1">
                              <li>
                                Overdue tasks:{" "}
                                {manager.risk_breakdown.inputs.overdue_count}
                              </li>
                              <li>
                                Due in 7d ratio:{" "}
                                {formatRatio(
                                  manager.risk_breakdown.inputs.due_7d_ratio,
                                )}
                              </li>
                              <li>
                                Workload:{" "}
                                {formatPercent(
                                  manager.risk_breakdown.inputs.workload_pct,
                                )}
                              </li>
                              <li>
                                Follow-up overdue ratio:{" "}
                                {formatRatio(
                                  manager.risk_breakdown.inputs
                                    .followup_overdue_ratio,
                                )}
                              </li>
                              <li>
                                On-time 30d:{" "}
                                {formatPercent(
                                  manager.risk_breakdown.inputs.on_time_30d_pct,
                                )}
                              </li>
                              <li>
                                On-time sample (30d):{" "}
                                {
                                  manager.risk_breakdown.inputs
                                    .on_time_30d_sample_size
                                }
                              </li>
                              <li>
                                No-deadline ratio:{" "}
                                {formatRatio(
                                  manager.risk_breakdown.inputs
                                    .no_deadline_ratio,
                                )}
                              </li>
                            </ul>
                          </div>
                        </details>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-[#374151]">
                      {manager.recommended_action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {showOverview ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <article className="rounded-xl border border-[#E5E7EB] p-3">
            <div className="mb-2 text-sm font-semibold text-[#111827]">
              Top Overdue Tasks
            </div>
            <ul className="space-y-2 text-xs">
              {data.deadline_control.top_overdue_tasks
                .slice(0, 8)
                .map((task) => (
                  <li
                    key={task.task_id}
                    className="rounded-lg border border-[#E5E7EB] p-2"
                  >
                    <div className="font-medium text-[#111827]">
                      {buildOrderHref(task.task_id, businessSlug, phoneRaw) ? (
                        <a
                          href={
                            buildOrderHref(
                              task.task_id,
                              businessSlug,
                              phoneRaw,
                            ) ?? "#"
                          }
                          className="text-[#111827] hover:text-[#364FC7] hover:underline"
                        >
                          {task.task_title}
                        </a>
                      ) : (
                        task.task_title
                      )}
                    </div>
                    <div className="mt-1 text-[#6B7280]">
                      Manager:{" "}
                      {buildManagerHref(task.manager_id ?? "") &&
                      task.manager_id ? (
                        <a
                          href={buildManagerHref(task.manager_id) ?? "#"}
                          className="text-[#364FC7] hover:underline"
                        >
                          {managerLabel(task.manager_name)}
                        </a>
                      ) : (
                        managerLabel(task.manager_name)
                      )}{" "}
                      • {task.days_overdue}d overdue
                    </div>
                    <div className="mt-1 text-[#374151]">
                      {task.recommended_action}
                    </div>
                  </li>
                ))}
            </ul>
          </article>
        </div>
      ) : null}

      {showAlerts ? (
        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="mb-2 text-sm font-semibold text-[#111827]">
            Alerts / Action Queue
          </div>
          <ul className="space-y-2 text-xs">
            {data.alerts.slice(0, 10).map((alert) => {
              const action = getAlertAction(alert);
              return (
                <li
                  key={alert.alert_id}
                  className="rounded-lg border border-[#E5E7EB] p-2"
                >
                  <div className="font-medium text-[#111827]">
                    {alert.problem}
                  </div>
                  <div className="mt-1 text-[#6B7280]">{alert.reason}</div>
                  <div className="mt-1 text-[#374151]">{action.note}</div>
                  {action.href ? (
                    <a
                      href={action.href}
                      className="mt-2 inline-flex items-center rounded-md border border-[#D0D5DD] px-2 py-1 text-[11px] font-semibold text-[#344054] hover:border-[#98A2B3] hover:text-[#111827]"
                    >
                      {action.linkLabel}
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </article>
      ) : null}

      {showReports ? (
        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="mb-2 text-sm font-semibold text-[#111827]">
            Manager Daily Reports
          </div>
          <p className="mb-2 text-xs text-[#6B7280]">
            End-of-day reports submitted when managers close their work day.
          </p>
          <form
            method="get"
            className="mb-3 grid grid-cols-1 gap-2 rounded-lg border border-[#E5E7EB] p-2 sm:grid-cols-5"
          >
            <input type="hidden" name="tab" value="reports" />
            {phoneRaw ? (
              <input type="hidden" name="u" value={phoneRaw} />
            ) : null}
            <label className="flex flex-col gap-1 text-[11px] text-[#4B5563]">
              <span>From</span>
              <input
                type="date"
                name="rfrom"
                defaultValue={String(reportFilter?.fromDate ?? "")}
                className="h-8 rounded-md border border-[#D0D5DD] px-2 text-xs text-[#111827]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-[#4B5563]">
              <span>To</span>
              <input
                type="date"
                name="rto"
                defaultValue={String(reportFilter?.toDate ?? "")}
                className="h-8 rounded-md border border-[#D0D5DD] px-2 text-xs text-[#111827]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-[#4B5563] sm:col-span-2">
              <span>Manager</span>
              <select
                name="rmanager"
                defaultValue={String(reportFilter?.managerId ?? "")}
                className="h-8 rounded-md border border-[#D0D5DD] bg-white px-2 text-xs text-[#111827]"
              >
                <option value="">All managers</option>
                {reportManagerOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="h-8 rounded-md border border-[var(--brand-600)] bg-[var(--brand-600)] px-3 text-[11px] font-semibold text-white hover:border-[var(--brand-700)] hover:bg-[var(--brand-700)]"
              >
                Apply
              </button>
              {hasReportFilter ? (
                <a
                  href={resetReportsHref}
                  className="inline-flex h-8 items-center rounded-md border border-[#D0D5DD] px-3 text-[11px] font-semibold text-[#344054] hover:border-[#98A2B3] hover:text-[#111827]"
                >
                  Reset
                </a>
              ) : null}
            </div>
          </form>
          {data.reports.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#D0D5DD] p-3 text-xs text-[#6B7280]">
              No daily reports yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-[#F9FAFB] text-[#4B5563]">
                  <tr>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Manager</th>
                    <th className="px-2 py-2">Tracked</th>
                    <th className="px-2 py-2">In Work</th>
                    <th className="px-2 py-2">Paused</th>
                    <th className="px-2 py-2">Start Day</th>
                    <th className="px-2 py-2">End Day</th>
                    <th className="px-2 py-2">Flag</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Done Today</th>
                    <th className="px-2 py-2">Tomorrow Plan</th>
                    <th className="px-2 py-2">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reports.map((report) => {
                    const timeFlag = getReportTimeFlag({
                      trackedHours: report.tracked_hours,
                      inWorkHours: report.in_work_hours,
                      pausedHours: report.paused_hours,
                    });

                    return (
                      <tr
                        key={report.report_id}
                        className="border-t border-[#E5E7EB]"
                      >
                        <td className="px-2 py-2 text-[#111827]">
                          {report.work_date}
                        </td>
                        <td className="px-2 py-2 text-[#111827]">
                          {managerLabel(report.manager_name)}
                        </td>
                        <td className="px-2 py-2">
                          {formatHours(report.tracked_hours)}
                        </td>
                        <td className="px-2 py-2">
                          {formatHours(report.in_work_hours)}
                        </td>
                        <td className="px-2 py-2">
                          {formatHours(report.paused_hours)}
                        </td>
                        <td className="px-2 py-2">
                          {formatDayTime(report.started_at)}
                        </td>
                        <td className="px-2 py-2">
                          {formatDayTime(report.finished_at)}
                        </td>
                        <td className="px-2 py-2">
                          {timeFlag ? (
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${timeFlag.toneClass}`}
                            >
                              {timeFlag.label}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-2 py-2">{report.status}</td>
                        <td className="px-2 py-2">
                          <details>
                            <summary className="cursor-pointer text-[var(--brand-600)]">
                              {report.completed_today_count}
                            </summary>
                            <ul className="mt-1 max-w-[260px] space-y-1 rounded bg-[#F9FAFB] p-2 text-[11px] text-[#374151]">
                              {report.completed_today_items.length === 0 ? (
                                <li>No completed tasks</li>
                              ) : (
                                report.completed_today_items.map(
                                  (item, idx) => (
                                    <li key={`${report.report_id}-done-${idx}`}>
                                      {item.href ? (
                                        <a
                                          href={
                                            buildOrderHref(
                                              item.href,
                                              businessSlug,
                                              phoneRaw,
                                            ) ?? "#"
                                          }
                                          className="text-[#364FC7] hover:underline"
                                        >
                                          {item.label}
                                        </a>
                                      ) : (
                                        item.label
                                      )}
                                    </li>
                                  ),
                                )
                              )}
                            </ul>
                          </details>
                        </td>
                        <td className="px-2 py-2">
                          <details>
                            <summary className="cursor-pointer text-[var(--brand-600)]">
                              {report.tomorrow_plan_count}
                            </summary>
                            <ul className="mt-1 max-w-[260px] space-y-1 rounded bg-[#F9FAFB] p-2 text-[11px] text-[#374151]">
                              {report.tomorrow_plan_items.length === 0 ? (
                                <li>No planned items</li>
                              ) : (
                                report.tomorrow_plan_items.map((item, idx) => (
                                  <li
                                    key={`${report.report_id}-tomorrow-${idx}`}
                                  >
                                    {item.href ? (
                                      <a
                                        href={
                                          buildOrderHref(
                                            item.href,
                                            businessSlug,
                                            phoneRaw,
                                          ) ?? "#"
                                        }
                                        className="text-[#364FC7] hover:underline"
                                      >
                                        {item.label}
                                      </a>
                                    ) : (
                                      item.label
                                    )}
                                  </li>
                                ))
                              )}
                            </ul>
                          </details>
                        </td>
                        <td className="px-2 py-2 text-[#374151]">
                          {String(report.daily_summary ?? "").trim() ||
                            "No summary provided"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      ) : null}

      {showProductivity ? (
        <article className="space-y-3 rounded-xl border border-[#E5E7EB] p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#111827]">
                Productivity Dashboard
              </div>
              <div className="text-xs text-[#6B7280]">
                Closed orders and follow-ups from {data.productivity.start_date}{" "}
                to {data.productivity.end_date}
              </div>
            </div>
            {productivityHrefs ? (
              <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-1">
                {(
                  [
                    { key: "day", label: "Day", href: productivityHrefs.day },
                    {
                      key: "week",
                      label: "Week",
                      href: productivityHrefs.week,
                    },
                    {
                      key: "month",
                      label: "Current Month",
                      href: productivityHrefs.month,
                    },
                  ] as const
                ).map((period) => (
                  <a
                    key={period.key}
                    href={period.href}
                    className={[
                      "rounded-md px-3 py-1.5 text-[12px] font-semibold transition",
                      data.productivity.period === period.key
                        ? "bg-[var(--brand-600)] text-white"
                        : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]",
                    ].join(" ")}
                  >
                    {period.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-[#E5E7EB] p-3">
              <div className="text-xs font-medium text-[#6B7280]">
                Team Closed Orders
              </div>
              <div className="mt-1 text-2xl font-semibold text-[#111827]">
                {data.productivity.team_closed_orders}
              </div>
            </article>
            <article className="rounded-xl border border-[#E5E7EB] p-3">
              <div className="text-xs font-medium text-[#6B7280]">
                Team Closed Follow-ups
              </div>
              <div className="mt-1 text-2xl font-semibold text-[#111827]">
                {data.productivity.team_closed_followups}
              </div>
            </article>
            <article className="rounded-xl border border-[#E5E7EB] p-3">
              <div className="text-xs font-medium text-[#6B7280]">
                Total Closed
              </div>
              <div className="mt-1 text-2xl font-semibold text-[#111827]">
                {data.productivity.team_total_closed}
              </div>
            </article>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] p-3">
            <div className="mb-2 text-sm font-semibold text-[#111827]">
              By Manager
            </div>
            <div className="space-y-2">
              {data.productivity.managers.map((manager) => {
                const max = Math.max(
                  1,
                  ...data.productivity.managers.map((x) => x.total_closed),
                );
                const width = (manager.total_closed / max) * 100;
                return (
                  <div
                    key={manager.manager_id}
                    className="rounded-lg border border-[#E5E7EB] p-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#111827]">
                        {managerLabel(manager.manager_name)}
                      </span>
                      <span className="text-[#4B5563]">
                        Orders {manager.closed_orders} • Follow-ups{" "}
                        {manager.closed_followups} • Total{" "}
                        {manager.total_closed}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEF2F7]">
                      <div
                        className="h-full bg-[var(--brand-600)]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </article>
      ) : null}
    </section>
  );
}
