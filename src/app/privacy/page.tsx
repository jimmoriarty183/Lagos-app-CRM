import type { Metadata } from "next";
import LegalDocumentPage from "@/components/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Ordo",
  description: "Ordo privacy policy.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="This policy explains how Ordo handles personal information."
      updatedAt="May 4, 2026"
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
          id: "instagram-and-meta-integrations",
          title: "Instagram and Meta integrations",
          paragraphs: [
            "When a merchant connects their Instagram Business account to Ordo, we process the following data through the Meta Graph API.",
            "What we receive from Meta: the merchant's Instagram account id, username, and account_type (used to confirm the account is a Business or Creator account, and shown back to the merchant in their Ordo dashboard); Direct Message (DM) content from customers who message the merchant's connected Instagram account; message sender Page-Scoped IDs (PSIDs) — Meta-issued opaque identifiers that let us reply to the same conversation.",
            "What we do with it: DM text is passed to Google's Gemini language model along with the merchant's product catalog (provided as a Google Sheet) to generate a contextual sales reply. The reply is sent back to the customer via the Instagram Graph API using the original PSID. Webhook delivery logs are retained for 30 days for debugging and then deleted. PSIDs are kept for the lifetime of the merchant's Ordo subscription so we can match returning customers to existing conversations.",
            "What we do NOT do: we do not store DM content beyond a 30-day rolling debug window; we do not sell, share, or rent any Instagram-derived data to third parties or advertisers; we do not use customer messages to train AI models — Gemini API calls are sent with no-training metadata where Google supports it; we do not contact customers outside the standard 24-hour customer service messaging window opened by their incoming message; we never send unsolicited promotional broadcasts.",
            "How customers opt out: customers can email support@ordo.uno from the address linked to their Instagram account to request deletion of all data we hold tied to their PSID — see https://ordo.uno/data-deletion for the full process. Merchants can revoke Ordo's access at any time from their Facebook account → Apps and Websites; revocation immediately stops all data flow from Meta.",
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
