import BusinessPeoplePanel from "../BusinessPeoplePanel";
import MobileAccordion from "./MobileAccordion";

type Role = "OWNER" | "MANAGER" | "GUEST"; // ✅ добавили

type Props = {
  owner?: {
    id: string;
    full_name: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email: string | null;
  } | null;
  business: {
    id: string;
    slug: string;
    name?: string | null;
    owner_phone?: string | null;
    manager_phone?: string | null;
  };
  role: Role;
  isOwnerManager: boolean;
  currentUserId?: string | null;
};

export default function MobileBusinessAccordion({
  owner,
  business,
  role,
  isOwnerManager,
  currentUserId,
}: Props) {
  return (
    <MobileAccordion title="Business" defaultOpen={false}>
      <div className="pt-1">
        <BusinessPeoplePanel
          businessId={business.id}
          businessSlug={business.slug}
          ownerPhone={business.owner_phone ?? null}
          legacyManagerPhone={business.manager_phone ?? null}
          initialOwner={owner ?? null}
          role={role}
          isOwnerManager={isOwnerManager}
          currentUserId={currentUserId}
          mode="summary"
        />
      </div>
    </MobileAccordion> // ✅ НЕ MobileAccoridon
  );
}
