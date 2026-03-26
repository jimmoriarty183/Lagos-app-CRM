import type { Metadata } from "next";
import LegalDocumentPage from "@/components/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Terms of Service | Ordo",
  description: "ORDO terms of service.",
};

export default function TermsPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="Please read these terms before using ORDO."
      updatedAt="March 26, 2026"
      sections={[
        {
          title: "General",
          paragraphs: [
            "ORDO is a SaaS CRM platform operated by an individual developer.",
            "The service allows users to manage orders, customers, and workflows through a web-based interface.",
          ],
        },
        {
          title: "Acceptable use",
          paragraphs: [
            "By using ORDO, you agree to use the service only for lawful purposes and not to misuse the platform.",
          ],
        },
        {
          title: "Billing and access",
          paragraphs: [
            "Subscriptions are billed on a recurring basis and can be cancelled at any time.",
            "Access to the service may be suspended if these terms are violated.",
          ],
        },
        {
          title: "Disclaimer",
          paragraphs: [
            "The service is provided \"as is\" without warranties. We are not responsible for data loss or business losses.",
          ],
        },
        {
          title: "Changes",
          paragraphs: [
            "We reserve the right to update these terms at any time.",
          ],
        },
      ]}
    />
  );
}

