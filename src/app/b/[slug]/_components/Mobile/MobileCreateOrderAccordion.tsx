import Accordion from "../../Accordion";
import Button from "../../Button";
import { createOrder } from "../../actions";

type Props = {
  businessId: string;
};

export default function MobileCreateOrderAccordion({ businessId }: Props) {
  return (
    <Accordion title="Create order" defaultOpen={false}>
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
      >
        <div style={{ display: "grid", gap: 10 }}>
          <input
            name="client_name"
            placeholder="Client name *"
            autoComplete="name"
            style={{
              height: 44,
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              outline: "none",
            }}
          />

          <input
            name="client_phone"
            placeholder="Client phone"
            inputMode="tel"
            autoComplete="tel"
            style={{
              height: 44,
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              outline: "none",
            }}
          />

          <textarea
            name="description"
            placeholder="Description"
            rows={3}
            style={{
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              padding: "10px 12px",
              resize: "vertical",
              outline: "none",
            }}
          />

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <input
              name="amount"
              placeholder="Amount *"
              inputMode="numeric"
              style={{
                height: 44,
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                outline: "none",
              }}
            />

            <input
              name="due_date"
              type="date"
              style={{
                height: 44,
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                outline: "none",
              }}
            />
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
  );
}
