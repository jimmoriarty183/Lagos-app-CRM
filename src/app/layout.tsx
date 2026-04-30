import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { RootLayoutClient } from "./layout-client";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0B14" },
    { media: "(prefers-color-scheme: light)", color: "#FAFBFC" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "Ordo",
    template: "%s | Ordo",
  },
  description:
    "Ordo is a business management system that keeps clients, tasks, and team workflows in one place.",
  applicationName: "Ordo",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/app_icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Ordo",
    description:
      "Bring your business into order with clients, tasks, and team workflows connected in one system.",
    images: [
      {
        url: "/brand/app_icon.svg",
        width: 512,
        height: 512,
        alt: "Ordo app icon",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shouldEnableGoogleTag = process.env.VERCEL_ENV === "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply theme synchronously before paint to avoid FOUC.
            Default = dark; existing prefs preserved via localStorage("theme"). */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.setAttribute('data-theme','dark');document.documentElement.style.colorScheme='dark';}})();`}
        </Script>
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="c4f78d66-aa96-4b34-b262-03351f8af84d"
          strategy="afterInteractive"
        />
        {shouldEnableGoogleTag ? (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-B34H3D8SG9"
              strategy="afterInteractive"
            />
            <Script id="google-gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                
                // 1. Set default consent state to DENIED until user decides
                gtag('consent', 'default', {
                  analytics_storage: 'denied',
                  ad_storage: 'denied'
                });
                
                // 2. Listen for CookieBot consent changes and update GA4
                if (window.CookieConsent) {
                  window.addEventListener('CookiebotOnConsentUpdated', function(e) {
                    const consent = window.CookieConsent.consent;
                    gtag('consent', 'update', {
                      analytics_storage: consent.analytics ? 'granted' : 'denied',
                      ad_storage: consent.marketing ? 'granted' : 'denied'
                    });
                    console.log('[GA4] Consent updated from CookieBot', consent);
                  });
                  
                  // Also update on load if already decided
                  window.addEventListener('CookiebotOnLoad', function(e) {
                    const consent = window.CookieConsent.consent;
                    gtag('consent', 'update', {
                      analytics_storage: consent.analytics ? 'granted' : 'denied',
                      ad_storage: consent.marketing ? 'granted' : 'denied'
                    });
                  });
                }
                
                // 3. Initialize GA4
                gtag('js', new Date());
                gtag('config', 'G-B34H3D8SG9', {
                  'allow_google_signals': false,
                  'anonymize_ip': true
                });
              `}
            </Script>
          </>
        ) : null}
        <Script
          src="https://mcp.figma.com/mcp/html-to-design/capture.js"
          async
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RootLayoutClient>{children}</RootLayoutClient>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
