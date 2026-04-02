import type { Metadata } from "next";
import LegalDocumentPage from "@/components/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Refund Policy | Ordo",
  description: "Ordo refund policy.",
};

export default function RefundPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Refund Policy"
      intro="This policy explains refunds for purchases made on ordo.uno."
      updatedAt="April 2, 2026"
      sections={[
        {
          title: "Who this policy applies to",
          paragraphs: [
            "This policy applies to purchases of Ordo subscriptions and services made through our checkout.",
            "For checkout and payment processing, Paddle acts as the authorized reseller and merchant of record.",
          ],
        },
        {
          title: "14-day refund period",
          paragraphs: [
            "You can request a full refund within 14 calendar days from the date of your first payment.",
            "If approved, the refund is returned to your original payment method.",
            "After the 14-day period, future charges can be stopped by canceling your subscription before renewal.",
          ],
        },
        {
          title: "How to request a refund",
          paragraphs: [
            "Email support@ordo.uno and include the email used for purchase.",
            "You can also request a refund through Paddle buyer support at paddle.net.",
          ],
        },
      ]}
    />
  );
}
