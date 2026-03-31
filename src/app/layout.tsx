import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
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
  colorScheme: "light",
  themeColor: "var(--brand-600)",
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
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light only" />
        <meta name="theme-color" content="#f5f6f8" />
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="c4f78d66-aa96-4b34-b262-03351f8af84d"
          strategy="beforeInteractive"
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
                gtag('js', new Date());
                gtag('config', 'G-B34H3D8SG9');
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
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
