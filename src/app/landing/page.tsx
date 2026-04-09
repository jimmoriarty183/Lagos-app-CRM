import type { Metadata } from "next";
import { MarketingLandingPage } from "@/components/MarketingLandingPage";

export const metadata: Metadata = {
  title: "CRM Landing Page",
  description:
    "Ordo CRM: manage orders, customers, analytics, and team workflows in one SaaS platform.",
};

export default function LandingMarketingRoute() {
  return <MarketingLandingPage />;
}
