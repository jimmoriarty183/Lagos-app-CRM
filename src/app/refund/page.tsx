import type { Metadata } from "next";
import LegalDocumentPage from "@/components/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Refund Policy | Ordo",
  description: "ORDO refund policy.",
};

export default function RefundPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Refund Policy"
      intro="This policy outlines ORDO billing refund terms."
      updatedAt="March 26, 2026"
      sections={[
        {
          title: "General",
          paragraphs: [
            "ORDO is a subscription-based SaaS product.",
          ],
        },
        {
          title: "Refund terms",
          paragraphs: [
            "Payments are generally non-refundable once a billing cycle has started.",
            "Users can cancel their subscription at any time to prevent future charges.",
            "If you experience issues or billing errors, you may contact support and refunds may be considered on a case-by-case basis.",
          ],
        },
      ]}
    />
  );
}
