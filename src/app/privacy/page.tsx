import type { Metadata } from "next";
import LegalDocumentPage from "@/components/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Ordo",
  description: "ORDO privacy policy.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="This policy explains how ORDO handles user information."
      updatedAt="March 26, 2026"
      sections={[
        {
          title: "General",
          paragraphs: [
            "ORDO is operated by an individual developer.",
          ],
        },
        {
          title: "What we collect",
          paragraphs: [
            "We collect basic user information such as email, account details, and usage data to provide and improve the service.",
          ],
        },
        {
          title: "Data sharing",
          paragraphs: [
            "We do not sell personal data to third parties.",
            "Data may be shared with trusted providers (such as payment processors) only as necessary to operate the service.",
          ],
        },
        {
          title: "Security",
          paragraphs: [
            "We take reasonable measures to protect user data, but cannot guarantee absolute security.",
          ],
        },
        {
          title: "Acceptance",
          paragraphs: [
            "By using ORDO, you agree to this policy.",
          ],
        },
      ]}
    />
  );
}

