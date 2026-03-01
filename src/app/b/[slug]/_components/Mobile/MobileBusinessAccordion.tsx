import BusinessPeoplePanel from "../BusinessPeoplePanel";
import MobileAccordion from "./MobileAccordion";

type Role = "OWNER" | "MANAGER" | "GUEST"; // ✅ добавили

type Props = {
  business: {
    id: string;
    slug: string;
    name?: string | null;
    owner_phone?: string | null;
    manager_phone?: string | null;
  };
  role: Role;
  isOwnerManager: boolean;
};

export default function MobileBusinessAccordion({
  business,
  role,
  isOwnerManager,
}: Props) {
  return (
    <MobileAccordion title="Business" defaultOpen={false}>
      <div className="pt-1">
        <BusinessPeoplePanel
          businessId={business.id}
          businessSlug={business.slug}
          ownerPhone={business.owner_phone ?? null}
          legacyManagerPhone={business.manager_phone ?? null}
          role={role}
          isOwnerManager={isOwnerManager}
          mode="summary"
        />
      </div>
    </MobileAccordion> // ✅ НЕ MobileAccoridon
  );
}
