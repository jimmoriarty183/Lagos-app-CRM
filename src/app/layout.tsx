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
};

export const metadata: Metadata = {
  title: "Corelix",
  description: "Corelix platform with CRM-ready modular architecture.",
  icons: {
    icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light only" />
        <meta name="theme-color" content="#f5f6f8" />
        <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />
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
