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
        <input name="client_name" className={inputCls} required />
      </label>

      <label className="grid gap-2">
        <span className={labelCls}>Client phone</span>
        <input name="client_phone" className={inputCls} />
      </label>

      <label className="grid gap-2">
        <span className={labelCls}>Description</span>
        <textarea
          name="description"
          rows={3}
          className={`${inputCls} h-auto py-3 resize-y`}
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="grid gap-2">
          <span className={labelCls}>Amount *</span>
          <input name="amount" type="number" required className={inputCls} />
        </label>

        <label className="grid gap-2">
          <span className={labelCls}>Due date</span>
          <input name="due_date" type="date" className={inputCls} />
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
  );
}
