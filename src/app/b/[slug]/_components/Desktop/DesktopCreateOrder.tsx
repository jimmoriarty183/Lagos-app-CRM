import Accordion from "../../Accordion";
import Button from "../../Button";
import { createOrder } from "../../actions";

type Props = {
  businessId: string;
  card: React.CSSProperties;
  cardHeader: React.CSSProperties;
  cardTitle: React.CSSProperties;
};

export default function DesktopCreateOrder({
  businessId,
  card,
  cardHeader,
  cardTitle,
}: Props) {
  return (
    <section className="desktopOnly" style={card}>
      <div style={cardHeader}>
        <div style={cardTitle}>Create order</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>Add a new order</div>
      </div>

      <Accordion title="Add order" defaultOpen={false}>
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
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                Client name *
              </span>
              <input
                name="client_name"
                placeholder="John"
                autoComplete="name"
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "0 12px",
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                Client phone
              </span>
              <input
                name="client_phone"
                placeholder="+234 801 234 5678"
                inputMode="tel"
                autoComplete="tel"
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "0 12px",
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Description</span>
              <textarea
                name="description"
                placeholder="e.g. delivery, address, comment..."
                rows={3}
                style={{
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "10px 12px",
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Amount *</span>
              <input
                name="amount"
                placeholder="15000"
                inputMode="numeric"
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "0 12px",
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Due date</span>
              <input
                name="due_date"
                type="date"
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "0 12px",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 12, opacity: 0.6 }}>
                Format: YYYY-MM-DD
              </span>
            </label>

            <Button
              type="submit"
              variant="primary"
              size="md"
              style={{ marginTop: 6, width: "100%" }}
            >
              Create
            </Button>
          </div>
        </form>
      </Accordion>
    </section>
  );
}
