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

function clamp(s: string, max = 34) {
  const t = (s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function statusBadgeCls(status: Status) {
  // mobile badge wrapper (внутри StatusCell останется интерактив)
  switch (status) {
    case "NEW":
      return "bg-blue-50 border-blue-100 text-blue-700";
    case "IN_PROGRESS":
    case "WAITING_PAYMENT":
      return "bg-amber-50 border-amber-100 text-amber-800";
    case "DONE":
      return "bg-green-50 border-green-100 text-green-800";
    default:
      return "bg-gray-100 border-gray-200 text-gray-700";
  }
}

function MobileOrderCard({
  o,
  businessSlug,
  phoneRaw,
  canManage,
  canEdit,
  todayISO,
}: {
  o: OrderRow;
  businessSlug: string;
  phoneRaw: string;
  canManage: boolean;
  canEdit: boolean;
  todayISO: string;
}) {
  const dueISO = o.due_date ? String(o.due_date).slice(0, 10) : null;
  const isOverdue =
    !!dueISO &&
    dueISO < todayISO &&
    (o.status === "NEW" || o.status === "IN_PROGRESS");

  return (
    <div
      className={[
        "bg-white rounded-xl border shadow-sm p-4",
        isOverdue ? "border-red-200" : "border-gray-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-gray-900 truncate">
            {clamp(o.client_name || "—", 40)}
          </div>

          <div className="mt-1 text-xs text-gray-500">
            <b className="text-gray-700">Order #{o.order_number ?? "-"}</b>{" "}
            <span className="text-gray-300">·</span>{" "}
            {new Date(o.created_at).toLocaleString("en-NG", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <div
          className={[
            "inline-flex items-center justify-center",
            "rounded-full border px-3 py-2 text-xs font-extrabold whitespace-nowrap min-h-9",
            statusBadgeCls(o.status),
          ].join(" ")}
        >
          <StatusCell orderId={o.id} value={o.status} canManage={canManage} />
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500">Amount</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900 tabular-nums">
            {fmtAmount(Number(o.amount))}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">Due</div>
          <div
            className={[
              "mt-1 text-sm font-bold",
              isOverdue ? "text-red-700" : "text-gray-900",
            ].join(" ")}
          >
            {o.due_date || "—"}
          </div>
          {isOverdue ? (
            <div className="mt-1 text-[11px] text-red-700/80 font-semibold">
              Overdue
            </div>
          ) : null}
        </div>
      </div>

      {o.client_phone ? (
        <div className="mt-3 text-sm text-gray-700">
          <span className="opacity-70">📞</span> {o.client_phone}
        </div>
      ) : null}

      {o.description ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-bold text-gray-900 underline underline-offset-2 opacity-90">
            📝 Show description
          </summary>
          <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
            {o.description}
          </div>
        </details>
      ) : null}

      <div className="mt-4 flex justify-end">
        {canEdit ? (
          <a
            href={`/b/${businessSlug}/o/${o.id}?u=${encodeURIComponent(
              phoneRaw
            )}`}
            className="h-10 inline-flex items-center justify-center px-4 rounded-lg border border-gray-200 bg-white text-sm font-extrabold text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Edit
          </a>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </div>
    </div>
  );
}

type Props = {
  list: OrderRow[];
  todayISO: string;
  businessSlug: string;
  phoneRaw: string;
  canManage: boolean;
  canEdit: boolean;
};

export default function MobileOrdersList({
  list,
  todayISO,
  businessSlug,
  phoneRaw,
  canManage,
  canEdit,
}: Props) {
  return (
    <div className="mobileOnly grid gap-3">
      {list.map((o) => (
        <MobileOrderCard
          key={o.id}
          o={o}
          businessSlug={businessSlug}
          phoneRaw={phoneRaw}
          canManage={canManage}
          canEdit={canEdit}
          todayISO={todayISO}
        />
      ))}
    </div>
  );
}
