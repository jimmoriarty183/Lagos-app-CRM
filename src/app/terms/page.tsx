import type { Metadata } from "next";
import LegalDocumentPage from "@/components/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Terms of Use | Ordero",
  description: "Ordero terms of use.",
};

export default function TermsPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Terms of Use"
      intro="These terms govern access to Ordero and set the basic rules for using the service in a business setting."
      updatedAt="March 17, 2026"
      sections={[
        {
          title: "Using Ordero",
          paragraphs: [
            "You may use Ordero only for lawful business operations and internal order management. You are responsible for activity performed through your account and for keeping your login credentials secure.",
            "You must provide accurate account information and keep it reasonably up to date so your workspace can function correctly.",
          ],
        },
        {
          title: "Workspace data",
          paragraphs: [
            "You retain responsibility for the customer, order, and team information entered into your workspace. Do not upload content you do not have the right to store or share.",
            "We may process your data to operate the product, maintain security, prevent abuse, and support essential service functionality.",
          ],
        },
        {
          title: "Availability and changes",
          paragraphs: [
            "Ordero may evolve over time. We may update features, improve workflows, or fix defects as part of normal product maintenance.",
            "We may suspend or limit access when required for security, abuse prevention, maintenance, or legal compliance.",
          ],
        },
        {
          title: "Termination",
          paragraphs: [
            "You may stop using Ordero at any time. We may suspend or terminate access if these terms are violated or if continued access creates security or legal risk.",
            "Some obligations, including payment obligations if introduced later and duties relating to lawful use of the service, survive termination.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            "If you have questions about these terms, contact the Ordero team through the support channel provided in your workspace or launch materials.",
          ],
        },
      ]}
    />
  );
}
