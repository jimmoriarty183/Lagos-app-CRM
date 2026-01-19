import { StatusCell } from "../../InlineCells";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type OrderRow = {
  id: string;
  client_name: string;
  client_phone: string | null;
  amount: number;
  description: string | null;
  due_date: string | null;
  status: Status;
  order_number: number | null;
  created_at: string;
};

function fmtAmount(n: number) {
  return new Intl.NumberFormat("uk-UA").format(n);
}

type Props = {
  list: OrderRow[];
  todayISO: string;
  businessSlug: string;
  phoneRaw: string;
  canManage: boolean;
  canEdit: boolean;
};

export default function DesktopOrdersTable({
  list,
  todayISO,
  businessSlug,
  phoneRaw,
  canManage,
  canEdit,
}: Props) {
  return (
    <div className="desktopOnly bg-white rounded-xl border border-gray-200 shadow-sm p-0 overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="px-4 py-3 text-xs font-semibold text-gray-500">
              Client
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500">
              Amount
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500">
              Due
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500">
              Status
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {list.map((o) => {
            const dueISO = o.due_date ? String(o.due_date).slice(0, 10) : null;

            const isOverdue =
              !!dueISO &&
              dueISO < todayISO &&
              (o.status === "NEW" || o.status === "IN_PROGRESS");

            return (
              <tr
                key={o.id}
                className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                  isOverdue ? "bg-red-50/40" : ""
                }`}
              >
                <td className="px-4 py-4 align-top">
                  <div className="text-xs text-gray-500 mb-1">
                    <strong className="text-gray-700">
                      Order #{o.order_number ?? "-"}
                    </strong>{" "}
                    <span className="text-gray-300">·</span> Created:{" "}
                    {new Date(o.created_at).toLocaleString("en-NG", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  <div className="font-semibold text-gray-900">
                    {o.client_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {o.client_phone || ""}
                  </div>

                  {o.description ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-semibold text-gray-900 underline underline-offset-2 opacity-90">
                        📝 Show description
                      </summary>
                      <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {o.description}
                      </div>
                    </details>
                  ) : null}
                </td>

                <td className="px-4 py-4 align-top font-extrabold text-gray-900 tabular-nums">
                  {fmtAmount(Number(o.amount))}
                </td>

                <td className="px-4 py-4 align-top">
                  <div
                    className={`${
                      isOverdue ? "text-red-700 font-semibold" : "text-gray-700"
                    }`}
                  >
                    {o.due_date || ""}
                  </div>
                  {isOverdue && (
                    <div className="text-xs text-red-700/80">Overdue</div>
                  )}
                </td>

                <td className="px-4 py-4 align-top">
                  <StatusCell
                    orderId={o.id}
                    value={o.status}
                    canManage={canManage}
                  />
                </td>

                <td className="px-4 py-4 align-top">
                  {canEdit ? (
                    <a
                      href={`/b/${businessSlug}/o/${
                        o.id
                      }?u=${encodeURIComponent(phoneRaw)}`}
                      className="h-9 inline-flex items-center justify-center px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
