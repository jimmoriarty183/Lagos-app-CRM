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
      intro="These Terms of Service govern your use of Ordo. They form a legally binding agreement between you and the service provider identified below."
      updatedAt="May 7, 2026"
      sections={[
        {
          id: "service-provider",
          title: "Service provider",
          paragraphs: [
            "Ordo (the \"Service\", available at https://ordo.uno) is provided by:",
            "Oleksandr Krupych, Sole Proprietor (in Ukrainian: ФОП Крупич Олександр Степанович).",
            "Registration number (EDR/ЄДР): 2011600000000022449. Registered with the Unified State Register of Legal Entities, Sole Proprietors and Civic Formations of Ukraine on 06.05.2026.",
            "Registered address: 32 Kozatska St., Apt. 131, Kyiv 03118, Ukraine.",
            "Primary activity (NACE / KVED): 62.01 Computer programming activities.",
            "Contact: aleksandr1krupych@gmail.com (general), support@ordo.uno (support and legal). Phone: +38 063 063 86 85.",
            "Ordo provides a web-based CRM platform for managing orders, customers, conversations, and AI-assisted sales workflows for small businesses operating internationally.",
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
            "Nothing in these terms limits or excludes liability that cannot be limited or excluded under applicable mandatory law (including, where applicable, the UK Consumer Rights Act 2015 and equivalent EU consumer-protection rules).",
          ],
        },
        {
          id: "governing-law",
          title: "Governing law and jurisdiction",
          paragraphs: [
            "These terms are governed by the laws of Ukraine, without regard to conflict-of-law rules.",
            "Where you are a consumer resident in the UK, EU/EEA, or Switzerland, you also benefit from the mandatory consumer-protection provisions of your country of residence — these terms do not deprive you of those rights.",
            "Disputes will first be resolved through good-faith negotiation. If unresolved, disputes will be submitted to the competent courts of Ukraine, except where mandatory consumer law gives a UK/EU/EEA consumer the right to bring proceedings in their country of residence.",
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
            "Questions about these terms can be sent to support@ordo.uno. Our service provider is Oleksandr Krupych, Sole Proprietor (registration 2011600000000022449), 32 Kozatska St., Apt. 131, Kyiv 03118, Ukraine.",
          ],
        },
      ]}
    />
  );
}
