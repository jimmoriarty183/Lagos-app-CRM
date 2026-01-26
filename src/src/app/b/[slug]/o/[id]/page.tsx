import { notFound, redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";
import { updateOrder } from "../../actions";

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type BusinessRow = {
  id: string;
  slug: string;
  owner_phone: string;
  manager_phone: string | null;
  plan: string;
  expires_at: string;
};

type OrderRow = {
  id: string;
  business_id: string;
  client_name: string;
  client_phone: string | null;
  description: string | null;
  amount: number;
  due_date: string | null;
  status: "NEW" | "DONE";
  paid: boolean;
  created_at: string;
};

export default async function EditOrderPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug, id }, sp] = await Promise.all([params, searchParams]);

  if (!slug || !id) notFound();

  // user phone from query (?u=...)
  const u = sp?.u;
  const phoneRaw =
    typeof u === "string"
      ? decodeURIComponent(u)
      : Array.isArray(u)
      ? decodeURIComponent(u[0] || "")
      : "";

  const phone = phoneRaw ? normalizePhone(phoneRaw) : "";

  // load business
  const { data: business } = await supabase
    .from("businesses")
    .select("id, slug, owner_phone, manager_phone, plan, expires_at")
    .eq("slug", slug)
    .single<BusinessRow>();

  if (!business) notFound();

  const ownerNorm = normalizePhone(business.owner_phone);
  const managerNorm = business.manager_phone
    ? normalizePhone(business.manager_phone)
    : "";

  const isOwner = !!phone && phone === ownerNorm;
  const isManager = !!phone && !!managerNorm && phone === managerNorm;

  const role: "OWNER" | "MANAGER" | "GUEST" = isOwner
    ? "OWNER"
    : isManager
    ? "MANAGER"
    : "GUEST";

  const isOwnerManager = isOwner && isManager;

  // can edit only manager OR owner-manager
  // can edit: OWNER or MANAGER (and owner-manager obviously too)
  const canEdit = role === "OWNER" || role === "MANAGER";
  if (!canEdit) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <h2 style={{ margin: 0 }}>Access denied</h2>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Only OWNER or MANAGER can edit orders.
        </div>
        <div style={{ marginTop: 16 }}>
          <a
            href={`/b/${business.slug}?u=${encodeURIComponent(phoneRaw)}`}
            style={{ textDecoration: "underline" }}
          >
            Back
          </a>
        </div>
      </div>
    );
  }

  // load order
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, business_id, client_name, client_phone, description, amount, due_date, status, paid, created_at"
    )
    .eq("id", id)
    .single<OrderRow>();

  if (!order || order.business_id !== business.id) notFound();

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Edit order</div>
        <div style={{ opacity: 0.75, marginTop: 4 }}>
          Business: <b>{business.slug}</b> · Order: <b>{order.id}</b>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 16,
          background: "white",
        }}
      >
        <form
          action={async (fd) => {
            "use server";

            const clientName = String(fd.get("client_name") || "").trim();
            const clientPhone = String(fd.get("client_phone") || "").trim();
            const description = String(fd.get("description") || "").trim();
            const amountRaw = String(fd.get("amount") || "").trim();
            const dueDate = String(fd.get("due_date") || "").trim();

            const amount = Number(amountRaw);
            if (!clientName) throw new Error("Client name is required");
            if (!Number.isFinite(amount) || amount <= 0)
              throw new Error("Amount must be > 0");

            await updateOrder({
              orderId: order.id,
              businessSlug: business.slug, // ✅ добавили
              clientName,
              clientPhone: clientPhone || null,
              description: description || null,
              amount,
              dueDate: dueDate || null,
            });

            redirect(`/b/${business.slug}?u=${encodeURIComponent(phoneRaw)}`);
          }}
          style={{ display: "grid", gap: 10 }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Client name *</span>
            <input
              name="client_name"
              defaultValue={order.client_name}
              style={{
                height: 40,
                borderRadius: 10,
                border: "1px solid #ddd",
                padding: "0 12px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Client phone</span>
            <input
              name="client_phone"
              defaultValue={order.client_phone || ""}
              style={{
                height: 40,
                borderRadius: 10,
                border: "1px solid #ddd",
                padding: "0 12px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Description</span>
            <textarea
              name="description"
              defaultValue={order.description || ""}
              rows={5}
              style={{
                borderRadius: 10,
                border: "1px solid #ddd",
                padding: "10px 12px",
                resize: "vertical",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Amount *</span>
            <input
              name="amount"
              inputMode="numeric"
              defaultValue={String(order.amount)}
              style={{
                height: 40,
                borderRadius: 10,
                border: "1px solid #ddd",
                padding: "0 12px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Due date</span>
            <input
              name="due_date"
              type="date"
              defaultValue={order.due_date || ""}
              style={{
                height: 40,
                borderRadius: 10,
                border: "1px solid #ddd",
                padding: "0 12px",
              }}
            />
          </label>

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button
              type="submit"
              style={{
                height: 44,
                borderRadius: 10,
                border: "none",
                background: "#111",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
                padding: "0 16px",
              }}
            >
              Save
            </button>

            <a
              href={`/b/${business.slug}?u=${encodeURIComponent(phoneRaw)}`}
              style={{
                height: 44,
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "white",
                color: "#111",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 16px",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
