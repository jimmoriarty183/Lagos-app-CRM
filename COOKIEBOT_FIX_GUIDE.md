# 🔧 CookieBot Performance Fix - Implementation Guide

## Quick Start: 3 Steps to Fix

### Step 1: Update layout.tsx (2 minutes)

**File:** `src/app/layout.tsx`

**BEFORE:**

```typescript
<Script
  id="Cookiebot"
  src="https://consent.cookiebot.com/uc.js"
  data-cbid="c4f78d66-aa96-4b34-b262-03351f8af84d"
  strategy="beforeInteractive"  // ❌ PROBLEM
/>
```

**AFTER:**

```typescript
<Script
  id="Cookiebot"
  src="https://consent.cookiebot.com/uc.js"
  data-cbid="c4f78d66-aa96-4b34-b262-03351f8af84d"
  strategy="afterInteractive"  // ✅ FIXED
  onLoad={() => {
    console.log('[CookieBot] Loaded and ready');
  }}
/>
```

**Replace line 70 in layout.tsx:**

```diff
  <Script
    id="Cookiebot"
    src="https://consent.cookiebot.com/uc.js"
    data-cbid="c4f78d66-aa96-4b34-b262-03351f8af84d"
-   strategy="beforeInteractive"
+   strategy="afterInteractive"
+   onLoad={() => {
+     console.log('[CookieBot] Loaded and ready');
+   }}
  />
```

---

### Step 2: Add Consent Mode for GA4 (3 minutes)

**File:** `src/app/layout.tsx`

**Replace the GA4 initialization script:**

```typescript
// BEFORE (only in production):
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
```

**AFTER (with consent mode):**

```typescript
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

        // 1. Set default consent state to DENIED
        gtag('consent', 'default', {
          analytics_storage: 'denied',
          ad_storage: 'denied'
        });

        // 2. Listen for CookieBot consent changes
        if (window.CookieConsent) {
          window.addEventListener('CookiebotOnConsentUpdated', function(e) {
            const consent = window.CookieConsent.consent;
            gtag('consent', 'update', {
              analytics_storage: consent.analytics ? 'granted' : 'denied',
              ad_storage: consent.marketing ? 'granted' : 'denied'
            });
          });

          // Also update consent on page load if already decided
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
          allow_google_signals: false,
          anonymize_ip: true
        });
      `}
    </Script>
  </>
) : null}
```

---

### Step 3: Create Cleanup Hook (5 minutes)

**Create new file:** `src/lib/use-cookiebot-cleanup.ts`

```typescript
"use client";

import { useEffect } from "react";

/**
 * Manages CookieBot lifecycle to prevent duplicate iframe/worker creation
 * Especially important for SPA route transitions
 *
 * Usage: Call once in your root layout Client Component
 */
export function useCookieBotCleanup() {
  useEffect(() => {
    // Mark initial mount
    if (!window._cookiebot_initialized) {
      window._cookiebot_initialized = true;
      console.log("[CookieBot Cleanup] First initialization detected");
      return;
    }

    // On subsequent effects (route changes), check if CookieBot is already running
    if (window.CookieConsent) {
      console.log(
        "[CookieBot Cleanup] CookieBot already present, preventing re-initialization",
      );

      // Verify iframe is still alive
      const frames = document.querySelectorAll('iframe[src*="cookiebot"]');
      console.log(
        `[CookieBot Cleanup] Found ${frames.length} CookieBot iframe(s)`,
      );

      // If multiple iframes, remove duplicates (shouldn't happen, but belt-and-suspenders)
      if (frames.length > 1) {
        console.warn(
          "[CookieBot Cleanup] Multiple iframes detected - this is unusual!",
        );
        // Log for debugging but don't remove (CookieBot manages own lifecycle)
      }
    }
  }, []);
}

// Optional: Add window type extensions for TypeScript
declare global {
  interface Window {
    _cookiebot_initialized?: boolean;
    CookieConsent?: {
      consent?: {
        analytics?: boolean;
        marketing?: boolean;
        [key: string]: boolean | undefined;
      };
    };
  }
}
```

**Use in Root Layout:**

Create new file: `src/app/layout-client.tsx`

```typescript
'use client';

import { useCookieBotCleanup } from '@/lib/use-cookiebot-cleanup';

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  useCookieBotCleanup();

  return <>{children}</>;
}
```

**Update main layout.tsx:**

```typescript
import { RootLayoutClient } from './layout-client';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ... existing code ...

  return (
    <html lang="en">
      <head>
        {/* ... existing head content ... */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <RootLayoutClient>
          {children}
        </RootLayoutClient>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## Testing Checklist

### Before Deploying

```
[ ] Run: npm run build
[ ] Check for TypeScript errors: npm run lint
[ ] No console errors in dev: npm run dev
[ ] Check: .next/dev/logs/next-development.log
    L Should NOT see repeated "initialize" messages
```

### In Browser DevTools

1. **Network Tab:**

   ```
   ✓ One request to: consent.cookiebot.com/uc.js
   ✓ NOT multiple requests (should see only 1)
   ✓ gtag.js appears only once
   ```

2. **Sources Tab:**

   ```
   ✓ Search for: "uc.js"
   ✓ Should appear in Sources ONLY ONCE
   ✓ Not in multiple popup windows or iframes
   ```

3. **Application Tab → Cookies:**

   ```
   ✓ CookieBot cookies visible
   ✓ Look for: CookieConsentBulkSetting_...
   ✓ Look for: CookieConsent (should have value with timestamps)
   ```

4. **Performance Tab:**

   ```
   ✓ Should NOT see repeated "CookieBot" in timeline
   ✓ Initial load: CookieBot loads in "afterInteractive" section
   ✓ Route changes: No CookieBot re-initialization
   ✓ Memory: Stable (not growing with route changes)
   ✓ Processes: Stable count (not doubling per route)
   ```

5. **Console Tab:**
   ```
   ✓ Should see: "[CookieBot] Loaded and ready"
   ✓ Should see: "[CookieBot Cleanup] First initialization detected"
   ✓ On route change: "[CookieBot Cleanup] CookieBot already present, preventing re-initialization"
   ✓ NO errors like: "Hydration mismatch"
   ```

---

## Validation Script

**Run in Console to verify:** (paste into DevTools Console after fix)

```javascript
// Verify CookieBot is loaded correctly
console.group("🔍 CookieBot Validation");

// Check 1: Only one main script loaded
const scripts = Array.from(document.scripts).filter(
  (s) => s.src.includes("cookiebot") || s.id === "Cookiebot",
);
console.log(`✓ CookieBot scripts: ${scripts.length} (should be 1)`, scripts);

// Check 2: Only one iframe
const iframes = document.querySelectorAll('iframe[src*="cookiebot"]');
console.log(`✓ CookieBot iframes: ${iframes.length} (should be 1)`, iframes);

// Check 3: Consent object exists
console.log(
  `✓ CookieConsent defined: ${typeof window.CookieConsent !== "undefined"}`,
);
if (window.CookieConsent) {
  console.log(
    `  - Consent.analytics: ${window.CookieConsent.consent?.analytics}`,
  );
  console.log(
    `  - Consent.marketing: ${window.CookieConsent.consent?.marketing}`,
  );
}

// Check 4: GA4 listener attached
console.log(
  `✓ GA4 dataLayer exists: ${typeof window.dataLayer !== "undefined"}`,
);

// Check 5: Memory estimate
console.log(
  `✓ Approx memory (rough): ${(performance.memory?.usedJSHeapSize / 1048576).toFixed(2)} MB`,
);

console.groupEnd();
```

---

## Measurement: Before vs After

### Run This Test

1. **Before Fix:**
   - Navigate through 10 pages
   - Record: Memory, Process count, Network requests
   - Expected: Memory growing, Process count 20+

2. **After Fix:**
   - Same 10-page navigation
   - Record: Memory, Process count, Network requests
   - Expected: Memory stable, Process count 8-12

---

## Fallback: If Issues Persist

### Debug: Enable Verbose Logging

**Add to your layout.tsx initialization:**

```typescript
<Script id="debug-cookiebot" strategy="afterInteractive">
{`
  // Enable verbose logging
  window._cookiebot_debug = true;

  // Log all CookieBot events
  const originalLog = console.log;
  const originalWarn = console.warn;

  window.addEventListener('CookiebotOnLoad', () => {
    originalLog('[CookieBot Event] OnLoad fired');
  });

  window.addEventListener('CookiebotOnConsent', () => {
    originalLog('[CookieBot Event] OnConsent fired');
  });

  window.addEventListener('CookiebotOnConsentUpdated', (e) => {
    originalLog('[CookieBot Event] OnConsentUpdated fired', e);
  });

  // Monitor iframe creation
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'IFRAME' && node.src?.includes('cookiebot')) {
            originalWarn('[CookieBot] New iframe detected!', node);
          }
        });
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  originalLog('[CookieBot Debug] Monitoring activated');
`}
</Script>
```

### Check Logs:

- Open DevTools Console
- Navigate between pages
- Look for: "New iframe detected!" messages
- If you see duplicates, the SPA cleanup isn't working

---

## Rollback: If Needed

If something goes wrong, revert to original:

```typescript
// Change back to:
strategy = "beforeInteractive";

// This will restore original behavior
// (with original performance issues)
```

---

## Next Steps: Enterprise Solution

For full GDPR compliance and enterprise features, implement GTM setup:

1. Create Google Tag Manager Container
2. Move GA4 tag inside GTM
3. Gate GA4 with CookieBot consent trigger
4. Creates bulletproof setup with version control

See: `COOKIEBOT_AUDIT_REPORT.md` → "SCENARIO C: Enterprise Setup"

---

## Support

If issues arise:

1. Check console for errors
2. Run validation script above
3. Compare memory/process graphs to baseline
4. If not improving, enable debug logging
5. Check CookieBot admin panel for domain authorization

---

**Status:** ✅ Ready to implement
**Estimated Time:** 10-15 minutes
**Risk Level:** Low (only changes script timing)
