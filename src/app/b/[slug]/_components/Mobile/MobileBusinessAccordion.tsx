import BusinessPeoplePanel from "../BusinessPeoplePanel";
import MobileAccordion from "./MobileAccordion";

type Role = "OWNER" | "MANAGER" | "GUEST";

type Props = {
  business: {
    id: string;
    slug: string;
    name?: string | null;
    owner_phone: string;
    manager_phone: string | null;
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
          ownerPhone={business.owner_phone}
          legacyManagerPhone={business.manager_phone}
          role={role}
          isOwnerManager={isOwnerManager}
        />
      </div>
    </MobileAccordion>
  );
}
