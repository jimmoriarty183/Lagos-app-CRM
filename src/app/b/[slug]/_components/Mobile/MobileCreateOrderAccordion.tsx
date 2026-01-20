import MobileAccordion from "./MobileAccordion";
import Button from "../../Button";
import { createOrder } from "../../actions";

type Props = {
  businessId: string;
};

export default function MobileCreateOrderAccordion({ businessId }: Props) {
  const inputCls =
    "w-full max-w-full min-w-0 h-11 rounded-xl border border-gray-200 px-3 outline-none " +
    "focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white";

  const labelCls = "text-xs font-semibold text-gray-600";

  return (
    <MobileAccordion title="Create order" defaultOpen={false}>
      <form
        action={async (fd) => {
          "use server";

          const clientName = String(fd.get("client_name") || "").trim();
          const clientPhoneRaw = String(fd.get("client_phone") || "").trim();
          const clientPhone = clientPhoneRaw.replace(/\s+/g, " ").trim();

          const amountRaw = String(fd.get("amount") || "").trim();
          const dueDate = String(fd.get("due_date") || "").trim();
          const description = String(fd.get("description") || "").trim();

          const amount = Number(amountRaw);

          if (!clientName) throw new Error("Client name is required");
          if (!Number.isFinite(amount) || amount <= 0)
            throw new Error("Amount must be > 0");

          await createOrder({
            businessId,
            clientName,
            clientPhone: clientPhone || undefined,
            amount,
            dueDate: dueDate || undefined,
            description: description || undefined,
          });
        }}
        className="mt-1 grid gap-3"
        style={{ overflowX: "hidden" }}
      >
        <label className="grid gap-1">
          <span className={labelCls}>Client name *</span>
          <input
            name="client_name"
            placeholder="John"
            autoComplete="name"
            className={inputCls}
            required
          />
        </label>

        <label className="grid gap-1">
          <span className={labelCls}>Client phone</span>
          <input
            name="client_phone"
            placeholder="+234 801 234 5678"
            inputMode="tel"
            autoComplete="tel"
            className={inputCls}
          />
        </label>

        <label className="grid gap-1">
          <span className={labelCls}>Description</span>
          <textarea
            name="description"
            placeholder="Delivery address, comment…"
            rows={3}
            className={`${inputCls} h-auto py-2.5 resize-y`}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="grid gap-1 min-w-0">
            <span className={labelCls}>Amount *</span>
            <input
              name="amount"
              placeholder="15000"
              inputMode="decimal"
              autoComplete="off"
              className={inputCls}
              required
            />
          </label>

          <label className="grid gap-1 min-w-0">
            <span className={labelCls}>Due date</span>
            <input name="due_date" type="date" className={inputCls} />
          </label>
        </div>

        <Button type="submit" size="sm" style={{ width: "100%" }}>
          Create
        </Button>

        <div className="text-[11px] text-gray-500">
          Tip: amount is required. Due date helps track overdue orders.
        </div>
      </form>
    </MobileAccordion>
  );
}
