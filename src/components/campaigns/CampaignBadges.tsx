import { Badge } from "@/components/ui/badge";
import type { Campaign, CampaignDeliveryMode } from "@/lib/campaigns/types";

type DeliveryProps = {
  channels: Campaign["channels"];
};

function getDeliveryMode(channels: Campaign["channels"]): CampaignDeliveryMode {
  const hasBell = channels.includes("bell");
  const hasPopup = channels.includes("popup_right");
  if (hasBell && hasPopup) return "both";
  if (hasPopup) return "popup_only";
  return "bell_only";
}

export function CampaignDeliveryBadge({ channels }: DeliveryProps) {
  const mode = getDeliveryMode(channels);
  if (mode === "both") {
    return (
      <Badge className="border-[var(--brand-200)] bg-[var(--brand-50)] text-[var(--brand-700)]">
        Bell + Popup
      </Badge>
    );
  }
  if (mode === "popup_only") {
    return (
      <Badge className="border-sky-200 bg-sky-50 text-sky-700">Popup</Badge>
    );
  }
  return (
    <Badge className="border-slate-200 bg-slate-100 text-slate-700">Bell</Badge>
  );
}

export function CampaignStatusBadge({
  status,
}: {
  status: Campaign["status"];
}) {
  if (status === "active")
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
        Sent
      </Badge>
    );
  if (status === "archived")
    return (
      <Badge className="border-slate-200 bg-slate-100 text-slate-700">
        Archived
      </Badge>
    );
  return (
    <Badge className="border-amber-200 bg-amber-50 text-amber-700">Draft</Badge>
  );
}

export function CampaignTypeBadge({ type }: { type: Campaign["type"] }) {
  if (type === "survey")
    return (
      <Badge className="border-violet-200 bg-violet-50 text-violet-700">
        Survey
      </Badge>
    );
  return (
    <Badge className="border-sky-200 bg-sky-50 text-sky-700">
      Notification
    </Badge>
  );
}

export function CampaignReadBadge({ isRead }: { isRead: boolean }) {
  return isRead ? (
    <Badge className="border-slate-200 bg-slate-100 text-slate-700">Read</Badge>
  ) : (
    <Badge className="border-blue-200 bg-blue-50 text-blue-700">Unread</Badge>
  );
}
