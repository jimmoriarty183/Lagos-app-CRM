# 🎬 Quick Start Commands

## ✅ Current Status

- ✅ All files created and configured
- ✅ Package installed (@paddle/paddle-js)
- ✅ Environment variables set (.env.local)
- ✅ Dev server ready to run

---

## 🚀 Start Development Server

```bash
npm run dev
```

Server will start on: http://localhost:3001

---

## 📝 Test Paddle Integration

### Option A: Use PaddleExample Component (Quick Demo)

1. Create test page: `src/app/paddle-test/page.tsx`
2. Add code:

```tsx
import PaddleExample from "@/components/PaddleExample";

export default function Page() {
  return <PaddleExample />;
}
```

3. Visit: http://localhost:3001/paddle-test
4. Click any button to open Paddle checkout

### Option B: Use BuyButton Directly

```jsx
import BuyButton from "@/components/BuyButton";

export default function Shop() {
  return (
    <BuyButton priceId="pri_01h2xcejqy55r61nf5pj194ysa" label="Buy Premium" />
  );
}
```

---

## 🔍 Verify Setup

```bash
# Check package installed
npm list @paddle/paddle-js

# Check env variable loaded
echo $NEXT_PUBLIC_PADDLE_CLIENT_TOKEN  # Should show token

# Verify files exist
ls src/components/BuyButton.jsx
ls src/components/PaddleExample.jsx
ls src/lib/use-cookiebot-cleanup.ts
```

---

## 📊 Check Documentation

```bash
# Main guides
cat PADDLE_INTEGRATION_GUIDE.md       # How to use Paddle
cat SESSION_FINAL_STATUS.md           # What was completed
cat COOKIEBOT_FIX_GUIDE.md           # CookieBot implementation
cat COOKIEBOT_AUDIT_REPORT.md        # Technical analysis
```

---

## 🧪 Test Paddle Checkout

1. **In Sandbox Mode** (for testing):

   ```jsx
   // In BuyButton.jsx, change:
   // environment: 'production' → environment: 'sandbox'

   // Test card: 4111 1111 1111 1111
   // Expiry: Any future date
   // CVC: Any 3 digits
   ```

2. **In Production Mode**:
   - Use real card for testing
   - Verify NEXT*PUBLIC_PADDLE_CLIENT_TOKEN has 'live*' prefix

---

## 🔐 Environment Setup

### View Current .env.local

```bash
cat .env.local
```

### Add Variables (if missing)

```
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=live_xxxxx...
```

### Update .env for Production (Vercel)

1. Go to: https://vercel.com/dashboard
2. Select project
3. Settings → Environment Variables
4. Add: `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`

---

## ❌ Troubleshooting

### Issue: "Token is undefined"

```bash
# Restart dev server
npm run dev
# (Kill with Ctrl+C and restart)
```

### Issue: Checkout doesn't open

```bash
# Check browser console (F12)
# Look for errors
# Verify price ID is correct
# Verify NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is set
```

### Issue: SSR/Hydration Errors

```
✓ Already fixed - BuyButton uses 'use client'
✓ Paddle import is in useEffect
✓ No window access during SSR
```

---

## 📦 Files You Need to Know

| File                               | Purpose         | Status       |
| ---------------------------------- | --------------- | ------------ |
| `src/components/BuyButton.jsx`     | Checkout button | ✅ Ready     |
| `src/components/PaddleExample.jsx` | Demo component  | ✅ Ready     |
| `src/app/layout.tsx`               | CookieBot fixed | ✅ Done      |
| `src/app/layout-client.tsx`        | Client wrapper  | ✅ Done      |
| `.env.local`                       | Paddle token    | ✅ Set       |
| `.env.example`                     | Env template    | ✅ Reference |

---

## 🎯 Next Steps

### Step 1: Test Locally

```bash
npm run dev
# Open http://localhost:3001
# Import BuyButton or PaddleExample
# Click button → checkout should open
```

### Step 2: Replace Price IDs

Get from: https://dashboard.paddle.com/products/price

```jsx
priceId = "pri_XXXXX"; // Replace with your actual ID
```

### Step 3: Deploy to Vercel

```bash
git add .
git commit -m "Add Paddle integration"
git push
# Vercel auto-deploys
```

### Step 4: Add Env Vars to Vercel

1. Vercel Dashboard
2. Project Settings
3. Environment Variables
4. Add NEXT_PUBLIC_PADDLE_CLIENT_TOKEN

---

## 📚 Documentation Files

Created during this session:

**Paddle Integration:**

- `PADDLE_INTEGRATION_GUIDE.md` ← START HERE

**CookieBot (Reference):**

- `COOKIEBOT_FIX_GUIDE.md` - Implementation steps
- `COOKIEBOT_AUDIT_REPORT.md` - Technical analysis
- `COOKIEBOT_AUDIT_SUMMARY.md` - Summary
- `ERROR_500_FIXED.md` - How 500 error was fixed
- `IMPLEMENTATION_COMPLETE.md` - What was done
- `FINAL_STATUS.md` - Performance metrics

**This Session:**

- `SESSION_FINAL_STATUS.md` - Complete session report
- `QUICK_START.md` - This file

---

## ⚡ TL;DR

```bash
# 1. Server already running?
npm run dev

# 2. Create test page
echo 'import PaddleExample from "@/components/PaddleExample"; export default function Page() { return <PaddleExample />; }' > src/app/test/page.tsx

# 3. Open browser
# http://localhost:3001/test

# 4. Click button
# Paddle checkout opens ✅

# 5. Done!
```

---

**Status:** 🟢 READY TO USE

All setup complete. Begin testing immediately.
