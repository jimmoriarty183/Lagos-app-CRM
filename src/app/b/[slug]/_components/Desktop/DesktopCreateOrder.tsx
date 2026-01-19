import Button from "../../Button";
import { createOrder } from "../../actions";

type Props = {
  businessId: string;
};

export default function DesktopCreateOrder({ businessId }: Props) {
  const inputCls =
    "w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900";
  const labelCls = "text-xs font-semibold text-gray-700";

  return (
    <details className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      {/* Header (кликабельный) */}
      <summary className="list-none cursor-pointer select-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-900 text-white flex items-center justify-center text-xl leading-none">
              +
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">
                Add order
              </div>
              <div className="text-xs text-gray-500">Click to open / close</div>
            </div>
          </div>

          <div className="text-sm font-semibold text-gray-900">Toggle</div>
        </div>
      </summary>

      {/* Body */}
      <div className="mt-4">
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
          className="grid gap-4"
        >
          <label className="grid gap-2">
            <span className={labelCls}>Client name *</span>
            <input name="client_name" placeholder="John" className={inputCls} />
          </label>

          <label className="grid gap-2">
            <span className={labelCls}>Client phone</span>
            <input
              name="client_phone"
              placeholder="+234 801 234 5678"
              inputMode="tel"
              className={inputCls}
            />
          </label>

          <label className="grid gap-2">
            <span className={labelCls}>Description</span>
            <textarea
              name="description"
              placeholder="e.g. delivery, address, comment..."
              rows={3}
              className={`${inputCls} h-auto py-3 resize-y`}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <input
                name="amount"
                type="number"
                required
                placeholder="15000"
                className={inputCls}
              />
            </div>

            {/* Due date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due date
              </label>
              <input name="due_date" type="date" className={inputCls} />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            style={{ width: "100%" }}
          >
            Create
          </Button>
        </form>
      </div>
    </details>
  );
}
