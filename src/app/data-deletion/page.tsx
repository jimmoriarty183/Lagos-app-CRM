import type { Metadata } from "next";
import LegalDocumentPage from "@/components/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Data Deletion | Ordo",
  description:
    "How to request deletion of your personal data from Ordo, including data received from connected Facebook and Instagram accounts.",
  alternates: { canonical: "/data-deletion" },
  robots: { index: true, follow: true },
};

export default function DataDeletionPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Data Deletion Instructions"
      intro="How to request deletion of your personal data from Ordo, including any information we received from connected Facebook or Instagram accounts."
      updatedAt="May 4, 2026"
      sections={[
        {
          id: "your-rights",
          title: "Your right to erasure",
          paragraphs: [
            "You can request the deletion of your personal data from Ordo at any time. We honor this right under the GDPR (Article 17, \"Right to erasure\"), the UK GDPR, the California Consumer Privacy Act (CCPA), and equivalent privacy regulations worldwide.",
            "This applies to all personal data Ordo holds about you, including any information we received from third-party platforms you connected — such as Facebook Pages, Instagram Business accounts, or Google Workspace.",
          ],
        },
        {
          id: "how-to-request",
          title: "How to request deletion",
          paragraphs: [
            "Send an email to support@ordo.uno from the address associated with your Ordo account, with the subject line \"Data deletion request\".",
            "If you signed up through a third-party provider (Facebook, Instagram, or Google), please mention which one in the email so we can locate the linked records.",
            "We will reply within 2 business days to confirm we have received your request and to verify your identity if needed.",
          ],
        },
        {
          id: "what-gets-deleted",
          title: "What we delete",
          paragraphs: [
            "Once your identity is verified, we permanently delete the following within 30 days:",
            "— Your account, profile, and authentication credentials.",
            "— All message history processed through Ordo (Instagram DMs, Facebook Messenger conversations, customer chats).",
            "— OAuth tokens and access credentials for any connected platforms.",
            "— Any personal data Ordo received from your connected Facebook Pages, Instagram Business accounts, or Google Sheets.",
            "— Profile metadata, preferences, and configuration data.",
            "We will send written confirmation to your email address when deletion is complete.",
          ],
        },
        {
          id: "what-we-keep",
          title: "What we may retain",
          paragraphs: [
            "Some records are retained for a limited period where required by law or legitimate business purposes:",
            "— Billing, invoicing, and tax records: typically up to 7 years, as required by financial regulations.",
            "— Security and fraud-prevention logs: up to 12 months, in anonymized or pseudonymized form.",
            "— Records of your deletion request itself, so we can demonstrate compliance.",
            "These records are stored separately, access-restricted, never used for marketing or analytics, and deleted as soon as the legal retention period expires.",
          ],
        },
        {
          id: "facebook-instagram",
          title: "If you connected Facebook or Instagram",
          paragraphs: [
            "You can revoke Ordo's access to your Facebook or Instagram account at any time without contacting us:",
            "— Facebook: Settings & Privacy → Settings → Apps and Websites → Active → select Ordo AI Sales Manager → Remove.",
            "— Instagram: Settings → Security → Apps and Websites → Active → select Ordo AI Sales Manager → Remove.",
            "Revoking access stops all future data sharing immediately. To also delete data Ordo already received, please follow the email process above — revoking access alone does not erase data already in our systems.",
          ],
        },
        {
          id: "contact",
          title: "Questions",
          paragraphs: [
            "For any questions about this process, contact us at support@ordo.uno. If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.",
          ],
        },
      ]}
    />
  );
}
