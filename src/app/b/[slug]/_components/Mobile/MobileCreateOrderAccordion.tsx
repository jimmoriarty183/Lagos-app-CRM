import Accordion from "../../Accordion";
import Button from "../../Button";
import { createOrder } from "../../actions";
import { Plus } from "lucide-react";

type Props = {
  businessId: string;
};

export default function MobileCreateOrderAccordion({ businessId }: Props) {
  const inputCls =
    "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none " +
    "focus:ring-2 focus:ring-gray-900 focus:border-gray-900";

  return (
    <Accordion
      title={
        (
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4 text-gray-400" />
            Create order
          </span>
        ) as any
      }
      defaultOpen={false}
    >
      <form
        action={async (fd) => {
          "use server";

          const clientName = String(fd.get("client_name") || "").trim();

          const clientPhoneRaw = String(fd.get("client_phone") || "").trim();
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
        className="grid gap-3"
        style={{
          overflowX: "hidden",
        }}
      >
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-gray-700">
            Client name *
          </span>
          <input
            name="client_name"
            placeholder="John"
            autoComplete="name"
            className={inputCls}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-gray-700">
            Client phone
          </span>
          <input
            name="client_phone"
            placeholder="+234 801 234 5678"
            inputMode="tel"
            autoComplete="tel"
            className={inputCls}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-gray-700">
            Description
          </span>
          <textarea
            name="description"
            placeholder="Delivery, address, comment…"
            rows={3}
            className={`${inputCls} resize-y`}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="grid gap-1 min-w-0">
            <span className="text-xs font-semibold text-gray-700">
              Amount *
            </span>
            <input
              name="amount"
              placeholder="15000"
              inputMode="decimal"
              autoComplete="off"
              className={inputCls}
            />
          </label>

          <label className="grid gap-1 min-w-0">
            <span className="text-xs font-semibold text-gray-700">
              Due date
            </span>
            <input
              name="due_date"
              type="date"
              className={inputCls}
              style={{
                WebkitAppearance: "none",
                appearance: "none",
              }}
            />
            <span className="text-[11px] text-gray-500">
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
      </form>
    </Accordion>
  );
}
