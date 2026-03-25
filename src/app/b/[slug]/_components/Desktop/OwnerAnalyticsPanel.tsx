import type { OwnerDashboardData } from "@/lib/owner-dashboard";

type Props = {
  data: OwnerDashboardData;
};

function formatPercent(value: number | null) {
  if (value === null) return "N/A";
  return `${value.toFixed(1)}%`;
}

function toneClass(value: number, highThreshold: number, mediumThreshold: number) {
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

export default function OwnerAnalyticsPanel({ data }: Props) {
  const totalTraffic = Math.max(
    1,
    data.deadline_control.traffic_bar.on_track +
      data.deadline_control.traffic_bar.at_risk +
      data.deadline_control.traffic_bar.overdue,
  );

  const onTrackWidth = (data.deadline_control.traffic_bar.on_track / totalTraffic) * 100;
  const atRiskWidth = (data.deadline_control.traffic_bar.at_risk / totalTraffic) * 100;
  const overdueWidth = (data.deadline_control.traffic_bar.overdue / totalTraffic) * 100;
  const tableManagers = data.managers;

  return (
    <section
      id="owner-analytics"
      className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#111827]">Owner Analytics</h2>
          <details className="relative">
            <summary
              className="inline-flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-full border border-[#D0D5DD] bg-white text-[12px] font-semibold text-[#475467] transition hover:border-[#98A2B3] hover:text-[#111827]"
              aria-label="How to use this dashboard"
              title="How to use this dashboard"
            >
              ?
            </summary>
            <div className="absolute left-0 top-8 z-20 w-[340px] rounded-xl border border-[#E5E7EB] bg-white p-3 text-xs text-[#344054] shadow-[0_12px_24px_rgba(16,24,40,0.12)]">
              <div className="text-sm font-semibold text-[#111827]">Quick guide for owner</div>
              <div className="mt-2 space-y-1">
                <p>
                  1. Start with `Overdue Tasks`, `Due in 7 Days`, and `Team Workload` in the top cards.
                </p>
                <p>
                  2. In `Deadline Control`, red means overdue, yellow means near deadline risk.
                </p>
                <p>
                  3. In `Manager Table`, focus on highest `Risk` first, then check `Action`.
                </p>
                <p>
                  4. Open `details` to see exactly why risk is high and what contributed points.
                </p>
                <p>
                  5. Use `Alerts / Action Queue` as your immediate execution list for today.
                </p>
              </div>
            </div>
          </details>
        </div>
        <span className="text-xs text-[#6B7280]">
          Updated: {new Date(data.summary.generated_at).toLocaleString("en-US")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="text-xs font-medium text-[#6B7280]">Active Tasks</div>
          <div className="mt-1 text-2xl font-semibold text-[#111827]">{data.summary.active_tasks}</div>
        </article>
        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="text-xs font-medium text-[#6B7280]">Overdue Tasks</div>
          <div className={`mt-1 text-2xl font-semibold ${toneClass(data.summary.overdue_tasks, 6, 1)}`}>
            {data.summary.overdue_tasks}
          </div>
        </article>
        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="text-xs font-medium text-[#6B7280]">Due in 7 Days</div>
          <div className="mt-1 text-2xl font-semibold text-[#111827]">{data.summary.due_7d}</div>
        </article>
        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="text-xs font-medium text-[#6B7280]">On-Time Completion</div>
          <div className="mt-1 text-2xl font-semibold text-[#111827]">
            {formatPercent(data.summary.on_time_completion_pct)}
          </div>
        </article>
        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="text-xs font-medium text-[#6B7280]">Team Workload</div>
          <div className={`mt-1 text-2xl font-semibold ${toneClass(data.summary.team_workload_pct, 130, 90)}`}>
            {formatPercent(data.summary.team_workload_pct)}
          </div>
        </article>
        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="text-xs font-medium text-[#6B7280]">Managers At Risk</div>
          <div className={`mt-1 text-2xl font-semibold ${toneClass(data.summary.managers_at_risk, 3, 1)}`}>
            {data.summary.managers_at_risk}
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-[#E5E7EB] p-3">
        <div className="mb-2 text-sm font-semibold text-[#111827]">Deadline Control (7 days)</div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
          <div className="flex h-full">
            <div className="bg-[#16a34a]" style={{ width: `${onTrackWidth}%` }} />
            <div className="bg-[#f59e0b]" style={{ width: `${atRiskWidth}%` }} />
            <div className="bg-[#dc2626]" style={{ width: `${overdueWidth}%` }} />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#4B5563]">
          <span>On Track: {data.deadline_control.traffic_bar.on_track}</span>
          <span>At Risk: {data.deadline_control.traffic_bar.at_risk}</span>
          <span>Overdue: {data.deadline_control.traffic_bar.overdue}</span>
          <span>No Deadline: {data.deadline_control.traffic_bar.no_deadline}</span>
        </div>
      </article>

      <article className="rounded-xl border border-[#E5E7EB] p-3">
        <div className="mb-2 text-sm font-semibold text-[#111827]">Manager Table</div>
        <p className="mb-2 text-xs text-[#6B7280]">
          `Risk` shows the total score (0–100). Open `details` to see the exact drivers: overdue tasks, tasks due
          in 7 days, workload, overdue follow-ups, on-time performance, and tasks without deadlines.
        </p>
        <p className="mb-2 text-xs text-[#6B7280]">Managers shown: {tableManagers.length}</p>
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
                <tr key={manager.manager_id} className="border-t border-[#E5E7EB]">
                  <td className="px-2 py-2 font-medium text-[#111827]">{managerLabel(manager.manager_name)}</td>
                  <td className="px-2 py-2">{manager.active_tasks}</td>
                  <td className="px-2 py-2">{manager.overdue}</td>
                  <td className="px-2 py-2">{manager.due_7d}</td>
                  <td className={`px-2 py-2 ${toneClass(manager.workload_pct, 130, 90)}`}>
                    {formatPercent(manager.workload_pct)}
                  </td>
                  <td className="px-2 py-2">{formatPercent(manager.on_time_pct_30d)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span className={toneClass(manager.risk_score, 60, 30)}>{manager.risk_score}</span>
                      <details>
                        <summary className="cursor-pointer text-[#6366F1]">details</summary>
                        <div className="mt-2 w-[320px] rounded-lg bg-[#F9FAFB] p-2 text-[11px] text-[#374151]">
                          <div className="font-semibold text-[#111827]">Score breakdown</div>
                          <ul className="mt-1 space-y-1">
                            <li>Overdue points: {manager.risk_breakdown.overdue_points}</li>
                            <li>Due 7d points: {manager.risk_breakdown.due7_points}</li>
                            <li>Workload points: {manager.risk_breakdown.workload_points}</li>
                            <li>Follow-up points: {manager.risk_breakdown.followup_points}</li>
                            <li>On-time points: {manager.risk_breakdown.ontime_points}</li>
                            <li>No-deadline points: {manager.risk_breakdown.no_deadline_points}</li>
                          </ul>
                          <div className="mt-2 font-semibold text-[#111827]">Inputs</div>
                          <ul className="mt-1 space-y-1">
                            <li>Overdue tasks: {manager.risk_breakdown.inputs.overdue_count}</li>
                            <li>Due in 7d ratio: {formatRatio(manager.risk_breakdown.inputs.due_7d_ratio)}</li>
                            <li>Workload: {formatPercent(manager.risk_breakdown.inputs.workload_pct)}</li>
                            <li>
                              Follow-up overdue ratio:{" "}
                              {formatRatio(manager.risk_breakdown.inputs.followup_overdue_ratio)}
                            </li>
                            <li>On-time 30d: {formatPercent(manager.risk_breakdown.inputs.on_time_30d_pct)}</li>
                            <li>On-time sample (30d): {manager.risk_breakdown.inputs.on_time_30d_sample_size}</li>
                            <li>No-deadline ratio: {formatRatio(manager.risk_breakdown.inputs.no_deadline_ratio)}</li>
                          </ul>
                        </div>
                      </details>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-[#374151]">{manager.recommended_action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="mb-2 text-sm font-semibold text-[#111827]">Top Overdue Tasks</div>
          <ul className="space-y-2 text-xs">
            {data.deadline_control.top_overdue_tasks.slice(0, 8).map((task) => (
              <li key={task.task_id} className="rounded-lg border border-[#E5E7EB] p-2">
                <div className="font-medium text-[#111827]">{task.task_title}</div>
                <div className="mt-1 text-[#6B7280]">
                  {task.manager_name} • {task.days_overdue}d overdue
                </div>
                <div className="mt-1 text-[#374151]">{task.recommended_action}</div>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-[#E5E7EB] p-3">
          <div className="mb-2 text-sm font-semibold text-[#111827]">Alerts / Action Queue</div>
          <ul className="space-y-2 text-xs">
            {data.alerts.slice(0, 10).map((alert) => (
              <li key={alert.alert_id} className="rounded-lg border border-[#E5E7EB] p-2">
                <div className="font-medium text-[#111827]">{alert.problem}</div>
                <div className="mt-1 text-[#6B7280]">{alert.reason}</div>
                <div className="mt-1 text-[#374151]">{alert.recommended_action}</div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
