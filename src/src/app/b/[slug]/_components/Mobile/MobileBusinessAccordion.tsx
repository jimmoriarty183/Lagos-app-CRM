import { Phone } from "lucide-react";
import MobileAccordion from "./MobileAccordion";

type Props = {
  business: { owner_phone: string; manager_phone: string | null };
  role: "OWNER" | "MANAGER" | "GUEST";
  phone: string;
  isOwnerManager: boolean;
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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${cls}`}
    >
      <Phone className="h-4 w-4 opacity-70" />
      {children}
    </span>
  );
}

export default function MobileBusinessAccordion({
  business,
  role,
  phone,
  isOwnerManager,
}: Props) {
  return (
    <MobileAccordion title="Business" defaultOpen={false}>
      <div className="grid gap-2">
        {role === "MANAGER" && !isOwnerManager ? (
          <Pill tone="blue">
            Manager:{" "}
            <b className="text-gray-900">{business.manager_phone || phone}</b>
          </Pill>
        ) : null}

        {role === "OWNER" && !isOwnerManager ? (
          <div className="flex flex-wrap gap-2">
            <Pill>
              Owner: <b className="text-gray-900">{business.owner_phone}</b>
            </Pill>
            <Pill tone="blue">
              Manager:{" "}
              <b className="text-gray-900">{business.manager_phone || "—"}</b>
            </Pill>
          </div>
        ) : null}

        {isOwnerManager ? (
          <Pill>
            Owner/Manager:{" "}
            <b className="text-gray-900">{business.owner_phone}</b>
          </Pill>
        ) : null}
      </div>
    </MobileAccordion>
  );
}
