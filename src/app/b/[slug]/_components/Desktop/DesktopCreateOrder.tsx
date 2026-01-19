import Accordion from "../../Accordion";
import Button from "../../Button";
import { createOrder } from "../../actions";
import { Plus } from "lucide-react";

type Props = {
  businessId: string;

  // старые пропсы оставил для совместимости
  card?: React.CSSProperties;
  cardHeader?: React.CSSProperties;
  cardTitle?: React.CSSProperties;
};

export default function DesktopCreateOrder({ businessId }: Props) {
  const inputCls =
    "px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900";
  const labelCls = "text-xs font-semibold text-gray-700";

  return (
    <section className="desktopOnly bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base sm:text-lg font-semibold text-gray-900">
            Create order
          </div>
          <div className="text-xs text-gray-500 mt-1">Add a new order</div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
          <Plus className="h-4 w-4" />
          New
        </span>
      </div>

      <div className="mt-4">
        <Accordion title="Add order" defaultOpen={false}>
          <form
            action={async (fd) => {
              "use server";
              const clientName = String(fd.get("client_name") || "").trim();

              const clientPhoneRaw = String(
                fd.get("client_phone") || ""
              ).trim();
              const clientPhone = clientPhoneRaw.replace(/\s+/g, " ");

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
            className="mt-2"
          >
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className={labelCls}>Client name *</span>
                <input
                  name="client_name"
                  placeholder="John"
                  autoComplete="name"
                  className={inputCls}
                />
              </label>

              <label className="grid gap-2">
                <span className={labelCls}>Client phone</span>
                <input
                  name="client_phone"
                  placeholder="+234 801 234 5678"
                  inputMode="tel"
                  autoComplete="tel"
                  className={inputCls}
                />
              </label>

              <label className="grid gap-2">
                <span className={labelCls}>Description</span>
                <textarea
                  name="description"
                  placeholder="e.g. delivery, address, comment..."
                  rows={3}
                  className={`${inputCls} resize-y`}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="grid gap-2">
                  <span className={labelCls}>Amount *</span>
                  <input
                    name="amount"
                    placeholder="15000"
                    inputMode="numeric"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-2">
                  <span className={labelCls}>Due date</span>
                  <input name="due_date" type="date" className={inputCls} />
                  <span className="text-xs text-gray-500">
                    Format: YYYY-MM-DD
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                style={{ width: "100%" }}
              >
                Create
              </Button>
            </div>
          </form>
        </Accordion>
      </div>
    </section>
  );
}
