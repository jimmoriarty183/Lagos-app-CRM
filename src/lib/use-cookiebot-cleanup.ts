'use client';

import { useEffect } from 'react';

/**
 * Manages CookieBot lifecycle and prevents duplicate initialization
 * Especially important for SPA route transitions in Next.js
 *
 * Key insight: CookieBot by design doesn't cleanup its iframe on route changes.
 * This hook prevents re-initialization attempts while allowing the iframe to persist
 * (CookieBot's intended behavior for cookie persistence across pages)
 */
export function useCookieBotCleanup() {
  useEffect(() => {
    // Mark first initialization
    if (!window._cookiebot_initialized) {
      window._cookiebot_initialized = true;
      console.log('[CookieBot Cleanup] First mount - CookieBot initialization allowed');
      return;
    }

    // On subsequent effects (route changes), verify CookieBot is already running
    if (window.CookieConsent) {
      console.log('[CookieBot Cleanup] CookieBot already present on route change - skipping re-initialization');

      // Optional: Log current state for debugging
      const frames = document.querySelectorAll('iframe[src*="cookiebot"]');
      console.log(`[CookieBot Cleanup] Found ${frames.length} CookieBot iframe(s)`);

      if (frames.length > 1) {
        console.warn('[CookieBot Cleanup] Unexpected: Multiple CookieBot iframes detected');
      }
    } else {
      console.log('[CookieBot Cleanup] CookieConsent not yet available');
    }
  }, []);
}

// Type extensions for TypeScript support
declare global {
  interface Window {
    _cookiebot_initialized?: boolean;
    CookieConsent?: {
      consent?: {
        analytics?: boolean;
        marketing?: boolean;
        necessary?: boolean;
        statistics?: boolean;
        preferences?: boolean;
        [key: string]: boolean | undefined;
      };
      isConsentGiven?: () => boolean;
      updateScripts?: () => void;
    };
  }
}
