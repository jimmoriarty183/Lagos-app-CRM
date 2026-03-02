import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "Ordero",
  description: "Order management",
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
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
