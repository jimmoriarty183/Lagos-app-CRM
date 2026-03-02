# Ordero

Ordero is a lightweight web-based order management system for small businesses.

It allows owners and managers to create, edit and manage customer orders, track payment status and control due dates through a clean and minimal interface.

---

## Features

- Create customer orders
- Edit order details
- Track order status (NEW / DONE)
- Track payment status (paid / unpaid)
- Optional order description
- Separate edit page for orders
- Role-based access (Owner / Manager)
- Mobile-first, responsive UI

---

## Tech Stack

- **Framework:** Next.js (App Router)
- **Backend & Database:** Supabase (PostgreSQL)
- **Architecture:** Server Actions (server-first)
- **Styling:** Minimal inline styles
- **State management:** Server-driven (no client state libraries)

---

## Roles & Access

- **OWNER**

  - View orders
  - View analytics (future scope)

- **MANAGER**

  - Create orders
  - Edit orders
  - Update order status and payment status

- **OWNER / MANAGER**

  - Full access (if the same phone number)

- **GUEST**
  - No access

Access is determined by a phone number passed via URL query parameters.

---

## Routes

- `/b/[slug]?u=<phone>`  
  Business page with order list

- `/b/[slug]/o/[id]?u=<phone>`  
  Edit order page

---

## Data Model

**Order**

- client_name
- client_phone (optional)
- description (optional)
- amount
- due_date (optional)
- status (NEW / DONE)
- paid (true / false)
- created_at

---

## UX Decisions

- Order description is hidden by default to keep the list clean
- Description can be expanded by user action
- Editing orders is implemented on a separate page
- After saving, users are redirected back to the order list

---

## Current Status

**MVP v0.2 — Stable**

The project is under active development and ready for further feature expansion.

---

## Planned Features

- Filters and search
- Extended analytics
- Authorization and authentication
- Subscription plans
- UI improvements

---

## License

MIT

## 🆕 Latest updates 11.01.2026

### Inline status & payment management

- Status and Paid fields are now editable **directly from the table**
- One-click interaction: click on a badge → select value → saved automatically
- No intermediate “edit / save / cancel” screens

### Improved UX

- Custom dropdown (popover) instead of native `<select>`
- No extra clicks or intermediate states
- Clean badge-based UI
- Confirmation dialog for destructive actions (`CANCELED`)

### Optimistic UI

- Status and payment values update **instantly**
- Server update happens in the background
- Automatic rollback on error to keep data consistent

### Technical improvements

- Fully client-side interactive cells (`StatusCell`, `PaidCell`)
- Server Actions used for all mutations
- TypeScript issues fixed (strict typing, refs, modules)
- Code is production-ready and safe to extend

---

## Vercel deploy stability notes

If Vercel build logs show successful `next build`, but deployment fails on `Deploying outputs...`, use this repository config as baseline:

- Build with webpack (`next build --webpack`) via `vercel.json`.
- Keep middleware runtime on default Edge runtime and avoid Node-only modules in middleware.

### Reproduce / verify from clean cache

1. In Vercel project settings, open **Deployments** and trigger **Redeploy** with **Use existing Build Cache** disabled.
2. Or redeploy from CLI with cache disabled:

```bash
vercel --prod --force
```

Expected result: successful deploy without internal error on output deployment stage.
