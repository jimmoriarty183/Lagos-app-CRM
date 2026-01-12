import Accordion from "../../Accordion";
import Button from "../../Button";
import { createOrder } from "../../actions";

type Props = {
  businessId: string;
};

export default function MobileCreateOrderAccordion({ businessId }: Props) {
  const fieldBase: React.CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    height: 44,
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    padding: "0 12px",
    outline: "none",
    background: "white",
    display: "block",
  };

  const textareaBase: React.CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    padding: "10px 12px",
    resize: "vertical",
    outline: "none",
    background: "white",
    display: "block",
  };

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
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          overflowX: "hidden", // ✅ страховка от горизонтального вылета
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 10,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            overflowX: "hidden", // ✅ ещё одна страховка (iOS иногда упрямый)
          }}
        >
          <input
            name="client_name"
            placeholder="Client name *"
            autoComplete="name"
            style={fieldBase}
          />

          <input
            name="client_phone"
            placeholder="Client phone"
            inputMode="tel"
            autoComplete="tel"
            style={fieldBase}
          />

          <textarea
            name="description"
            placeholder="Description"
            rows={3}
            style={textareaBase}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 10,
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              overflow: "hidden", // ✅ КЛЮЧЕВО: клипает вылет date-поля на iOS
            }}
          >
            <div style={{ minWidth: 0 }}>
              <input
                name="amount"
                placeholder="Amount *"
                inputMode="decimal"
                autoComplete="off"
                style={fieldBase}
              />
            </div>

            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <input
                name="due_date"
                type="date"
                style={{
                  ...fieldBase,
                  paddingRight: 10,
                  WebkitAppearance: "none", // ✅ iOS Safari фикс
                  appearance: "none",
                  background: "white",
                  minWidth: 0,
                  maxWidth: "100%",
                }}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            style={{
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              minWidth: 0,
            }}
          >
            Create
          </Button>
        </div>
      </form>
    </Accordion>
  );
}
