import type { Metadata } from "next";
import { CleaningLanding } from "./CleaningLanding";

export const metadata: Metadata = {
  title: "Ordo — CRM for UK Cleaning Businesses",
  description:
    "Stop managing jobs on WhatsApp. Ordo gives UK cleaning businesses one place for jobs, customers and team — so you stop losing hours to spreadsheets and group chats.",
  alternates: {
    canonical: "/for-cleaning-companies",
  },
  openGraph: {
    type: "website",
    url: "/for-cleaning-companies",
    title: "Ordo — CRM for UK Cleaning Businesses",
    description:
      "One place for jobs, customers and team. Built for UK cleaning businesses. First 10 founding members get 1 month free + 50% off the next payment.",
    siteName: "Ordo",
    locale: "en_GB",
    images: [
      {
        url: "/brand/app_icon.svg",
        width: 512,
        height: 512,
        alt: "Ordo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ordo — CRM for UK Cleaning Businesses",
    description:
      "One place for jobs, customers and team. Built for UK cleaning businesses.",
    images: ["/brand/app_icon.svg"],
  },
};

export default function ForCleaningCompaniesPage() {
  return <CleaningLanding />;
}
