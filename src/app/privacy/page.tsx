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
      intro="This policy explains what information Ordo handles and why that information is used when you work inside the product."
      updatedAt="March 17, 2026"
      sections={[
        {
          title: "Information we collect",
          paragraphs: [
            "Ordo may collect account details, workspace information, CRM records, task data, team activity, device and browser data, and operational logs needed to run the service.",
            "Some information is provided directly by you, while other data is generated automatically as part of authentication, security monitoring, and product usage.",
          ],
        },
        {
          title: "How we use information",
          paragraphs: [
            "We use information to provide the service, authenticate users, support workspace collaboration, secure the platform, troubleshoot issues, and improve product reliability.",
            "We may also use limited operational information to detect abuse, enforce product rules, and comply with legal obligations.",
          ],
        },
        {
          title: "Sharing and access",
          paragraphs: [
            "Workspace data is shared with authorized members of the same business workspace based on their access level. We do not sell personal information.",
            "Service providers may process data on our behalf only when needed to host infrastructure, deliver authentication, store files, or support core product operations.",
          ],
        },
        {
          title: "Retention and security",
          paragraphs: [
            "We retain information for as long as reasonably necessary to operate the service, maintain records, resolve disputes, and meet legal or security requirements.",
            "We apply reasonable administrative and technical safeguards, but no system can guarantee absolute security.",
          ],
        },
        {
          title: "Questions",
          paragraphs: [
            "If you need privacy-related help, contact the Ordo team through the support channel associated with your account or launch materials.",
          ],
        },
      ]}
    />
  );
}

