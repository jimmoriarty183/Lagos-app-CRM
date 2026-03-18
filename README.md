# Ordo

Ordo is a business management system that keeps clients, tasks, and team workflows in one place.

The current public module is CRM. The platform foundation is already prepared for future Tasks and Academy modules without changing the product architecture.

## Positioning

- Ordo is not just a task tool or a spreadsheet wrapper.
- It is a structured workspace for running client operations, team execution, and internal knowledge inside one system.
- Core promise: bring the business into order.

## Current product scope

- CRM is enabled and visible
- Tasks is prepared in architecture and routing, but hidden
- Academy is prepared in architecture and routing, but hidden
- Settings remains available as a platform-level area

## Tech stack

- Next.js App Router
- Supabase
- Server Actions
- Modular platform configuration via `src/config/modules.ts`

## Brand assets

Place approved Ordo assets in `public/brand/` with these filenames:

- `ordo_full.png`
- `favicon_16.png`
- `favicon_32.png`
- `app_icon_128.png`
- `app_icon_256.png`

Code is already prepared to reference these paths in metadata and manifest.

## Routes

- `/app`
- `/app/crm`
- `/app/tasks`
- `/app/academy`
- `/app/settings`

## Notes

- The UI should currently expose only CRM and Settings.
- Hidden modules are controlled through the centralized module registry.
- Workspace-oriented data modeling is prepared for platform growth.
