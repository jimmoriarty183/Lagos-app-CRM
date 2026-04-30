"use client";

import { useEffect } from "react";
import { AuthHashHandler } from "@/components/AuthHashHandler";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useCookieBotCleanup } from "@/lib/use-cookiebot-cleanup";

/**
 * Client-side wrapper for RootLayout
 * Handles CookieBot lifecycle management for SPA navigation + theme provider.
 */
export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  // Prevent duplicate CookieBot initialization on route changes
  useCookieBotCleanup();

  // Log when CookieBot is loaded
  useEffect(() => {
    if (typeof window !== "undefined" && window.CookieConsent) {
      console.log("[CookieBot] Loaded and ready after React hydration");
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthHashHandler />
      {children}
    </ThemeProvider>
  );
}
