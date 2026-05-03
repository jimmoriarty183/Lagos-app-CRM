import type { Metadata } from "next";
import LegalDocumentPage from "@/components/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Ordo",
  description: "Ordo privacy policy.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="This policy explains how Ordo handles personal information."
      updatedAt="April 2, 2026"
      sections={[
        {
          title: "Company",
          paragraphs: [
            "This service is provided by Ordo.",
          ],
        },
        {
          title: "Information we collect",
          paragraphs: [
            "We collect basic user information such as email, account details, and usage data to provide and improve the service.",
          ],
        },
        {
          title: "How we share information",
          paragraphs: [
            "We do not sell personal data to third parties.",
            "Data may be shared with trusted providers only as needed to operate the service, including Paddle for checkout and payment processing.",
          ],
        },
        {
          title: "Security",
          paragraphs: [
            "We take reasonable measures to protect user data, but cannot guarantee absolute security.",
          ],
        },
        {
          id: "data-deletion",
          title: "Data deletion",
          paragraphs: [
            "You have the right to request deletion of your personal data at any time, in line with the GDPR (Article 17, \"Right to erasure\") and equivalent privacy regulations.",
            "Detailed instructions — including how to submit a request, what we delete, what we may retain by law, and how to revoke access from Facebook or Instagram — are available on our dedicated Data Deletion page: https://ordo.uno/data-deletion",
            "For any other privacy questions, contact support@ordo.uno.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            "Privacy questions can be sent to support@ordo.uno.",
          ],
        },
      ]}
    />
  );
}
