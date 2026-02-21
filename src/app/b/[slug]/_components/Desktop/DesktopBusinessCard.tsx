import { Phone } from "lucide-react";
import InviteManager from "../InviteManager";

type Props = {
  business: {
    id: string;
    slug: string;
    owner_phone: string;
    manager_phone: string | null;
  };
  role: "OWNER" | "MANAGER" | "GUEST";
  phone: string;
  isOwnerManager: boolean;

  // старые пропсы оставил для совместимости (можно убрать позже)
  card?: React.CSSProperties;
  cardHeader?: React.CSSProperties;
  cardTitle?: React.CSSProperties;
};

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue";
}) {
  const cls =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:text-sm ${cls}`}
    >
      <Phone className="h-4 w-4 opacity-70" />
      {children}
    </span>
  );
}

export default function DesktopBusinessCard({
  business,
  role,
  phone,
  isOwnerManager,
}: Props) {
  return (
    <section className="desktopOnly bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Business</div>
          <div className="mt-1 text-base sm:text-lg font-semibold text-gray-900">
            {business.slug}
          </div>
        </div>

        <div className="text-xs text-gray-500">{role}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {role === "MANAGER" && !isOwnerManager && (
          <Pill tone="blue">
            Manager:{" "}
            <b className="text-gray-900">{business.manager_phone || phone}</b>
          </Pill>
        )}

        {role === "OWNER" && !isOwnerManager && (
          <>
            <Pill>
              Owner: <b className="text-gray-900">{business.owner_phone}</b>
            </Pill>
            <Pill tone="blue">
              Manager:{" "}
              <b className="text-gray-900">{business.manager_phone || "—"}</b>
            </Pill>
          </>
        )}

        {isOwnerManager && (
          <Pill>
            Owner/Manager:{" "}
            <b className="text-gray-900">{business.owner_phone}</b>
          </Pill>
        )}
      </div>

      {/* ✅ Ввод email + Invite — только для OWNER */}
      {role === "OWNER" && !isOwnerManager && (
        <InviteManager businessId={business.id} />
      )}
    </section>
  );
}
