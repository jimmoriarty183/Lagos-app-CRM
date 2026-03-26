import { AdminShell } from "@/app/admin/_components/AdminShell";
import { AdminStatCard } from "@/app/admin/_components/AdminCards";
import { requireAdminUser } from "@/lib/admin/access";
import { supabaseAdmin } from "@/lib/supabase/admin";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type SalesRequestRow = {
  id: string;
  created_at: string | null;
  full_name: string | null;
  work_email: string | null;
  company_name: string | null;
  team_size: string | null;
  current_tool: string | null;
  main_goal: string | null;
  timeline: string | null;
  notes: string | null;
  status: string | null;
};

function compactPreview(value: string | null, limit = 34) {
  const text = cleanText(value);
  if (!text) return "-";
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function ExpandableCell({ value }: { value: string | null }) {
  const text = cleanText(value);
  if (!text) return <span>-</span>;
  if (text.length <= 48) return <span className="block break-words">{text}</span>;

  return (
    <details className="group max-w-[340px]">
      <summary className="cursor-pointer list-none text-slate-700">
        <span className="inline-flex items-center gap-2">
          <span className="truncate">{compactPreview(text, 36)}</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            Open
          </span>
        </span>
      </summary>
      <div className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700">
        {text}
      </div>
    </details>
  );
}

export default async function AdminSalesRequestsPage() {
  const { workspaceHref } = await requireAdminUser("/admin/sales");
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("sales_requests")
    .select(
      "id, created_at, full_name, work_email, company_name, team_size, current_tool, main_goal, timeline, notes, status",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(cleanText(error.message) || "Failed to load sales requests");
  }

  const requests = ((data ?? []) as SalesRequestRow[]).map((item) => ({
    ...item,
    status: cleanText(item.status || "new").toLowerCase(),
  }));

  const total = requests.length;
  const open = requests.filter((item) => item.status === "new").length;
  const handled = requests.filter((item) => item.status !== "new").length;

  return (
    <AdminShell
      activeHref="/admin/sales"
      workspaceHref={workspaceHref}
      title="Sales requests"
      description="Inbound enterprise/contact-sales form submissions from the pricing page."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard label="Total" value={total} hint="All captured sales requests" />
        <AdminStatCard label="New" value={open} hint="Needs first response" />
        <AdminStatCard label="Handled" value={handled} hint="Status moved from new" />
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Work email</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Team size</th>
                <th className="px-4 py-3 font-semibold">Current tool</th>
                <th className="px-4 py-3 font-semibold">Main goal</th>
                <th className="px-4 py-3 font-semibold">Timeline</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.length ? (
                requests.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(item.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.full_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.work_email || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <ExpandableCell value={item.company_name} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.team_size || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <ExpandableCell value={item.current_tool} />
                    </td>
                    <td className="max-w-[320px] px-4 py-3 text-slate-700">
                      <ExpandableCell value={item.main_goal} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.timeline || "-"}</td>
                    <td className="max-w-[320px] px-4 py-3 text-slate-700">
                      <ExpandableCell value={item.notes} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          item.status === "new"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700",
                        ].join(" ")}
                      >
                        {item.status || "new"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                    No sales requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
