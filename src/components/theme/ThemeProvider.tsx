"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * App-wide theme provider. Backed by next-themes:
 * - attribute="data-theme" → toggles `<html data-theme="dark|light">`
 * - defaultTheme="dark"   → new visitors land in dark
 * - enableSystem={false}  → never auto-switch on OS preference
 *
 * The synchronous init script in `app/layout.tsx` sets data-theme + color-scheme
 * before paint to avoid FOUC; next-themes then takes over after hydration.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
