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
          title: "Contact",
          paragraphs: [
            "Privacy questions can be sent to support@ordo.uno.",
          ],
        },
      ]}
    />
  );
}
