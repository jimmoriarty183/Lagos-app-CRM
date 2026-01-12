import Accordion from "../../Accordion";

type Props = {
  business: { owner_phone: string; manager_phone: string | null };
  role: "OWNER" | "MANAGER" | "GUEST";
  phone: string;
  isOwnerManager: boolean;
};

export default function MobileBusinessAccordion({
  business,
  role,
  phone,
  isOwnerManager,
}: Props) {
  return (
    <Accordion title="Business" defaultOpen={false}>
      <div style={{ display: "grid", gap: 8 }}>
        {role === "MANAGER" && !isOwnerManager ? (
          <div style={{ opacity: 0.9 }}>
            Manager phone: <b>{business.manager_phone || phone}</b>
          </div>
        ) : null}

        {role === "OWNER" && !isOwnerManager ? (
          <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
            Owner phone: <b>{business.owner_phone}</b>
            <br />
            Manager phone: <b>{business.manager_phone || "—"}</b>
          </div>
        ) : null}

        {isOwnerManager ? (
          <div style={{ opacity: 0.9 }}>
            Owner/Manager phone: <b>{business.owner_phone}</b>
          </div>
        ) : null}
      </div>
    </Accordion>
  );
}
