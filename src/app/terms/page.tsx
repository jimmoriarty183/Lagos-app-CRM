import type { Metadata } from "next";
import LegalDocumentPage from "@/components/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Terms of Service | Ordo",
  description: "Ordo terms of service.",
};

export default function TermsPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="These Terms of Service govern your use of Ordo."
      updatedAt="May 4, 2026"
      sections={[
        {
          title: "Company and service provider",
          paragraphs: [
            "This service is provided by Ordo.",
            "Ordo provides a web-based CRM platform for managing orders, customers, and workflows.",
          ],
        },
        {
          title: "Using the service",
          paragraphs: [
            "You agree to use Ordo only for lawful business purposes and in line with these terms.",
            "You are responsible for your account credentials and activity under your account.",
          ],
        },
        {
          title: "Billing and subscriptions",
          paragraphs: [
            "Paid plans renew automatically until canceled.",
            "You can cancel at any time to stop future renewals.",
            "Refunds are handled according to our Refund Policy.",
          ],
        },
        {
          title: "Checkout and payments",
          paragraphs: [
            "Payments are processed through Paddle.",
            "Paddle is the authorized reseller and merchant of record for checkout transactions.",
          ],
        },
        {
          id: "third-party-services",
          title: "Third-party services",
          paragraphs: [
            "Ordo integrates with third-party services to provide its functionality. Use of these integrations is also governed by their respective terms:",
            "Meta Platforms (Instagram, Facebook): https://www.facebook.com/legal/terms",
            "Google (Gemini, Sheets): https://policies.google.com/terms",
            "Paddle (payments): https://www.paddle.com/legal/terms",
            "By using Ordo's Instagram or Facebook integrations, you also agree to Meta's Platform Terms and Developer Policies. By using Ordo's AI sales assistant, you agree to Google's Generative AI Terms.",
          ],
        },
        {
          title: "Availability and liability",
          paragraphs: [
            "The service is provided on an \"as is\" and \"as available\" basis.",
            "To the maximum extent permitted by law, Ordo is not liable for indirect or consequential damages.",
          ],
        },
        {
          title: "Changes to these terms",
          paragraphs: [
            "We may update these terms from time to time.",
            "Continued use of the service after updates means you accept the updated terms.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            "Questions about these terms can be sent to support@ordo.uno.",
          ],
        },
      ]}
    />
  );
}
