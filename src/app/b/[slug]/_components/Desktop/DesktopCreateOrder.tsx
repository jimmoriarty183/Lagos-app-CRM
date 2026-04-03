"use client";

import { ClientOrderForm } from "@/app/b/[slug]/_components/orders/ClientOrderForm";

type Props = {
  businessId: string;
  businessSlug: string;
  compact?: boolean;
  submitLabel?: string;
  stacked?: boolean;
};

export default function DesktopCreateOrder({
  businessId,
  businessSlug,
}: Props) {
  return (
    <ClientOrderForm
      businessId={businessId}
      businessSlug={businessSlug}
      compact
      onCreated={() => {
        window.location.reload();
      }}
    />
  );
}
