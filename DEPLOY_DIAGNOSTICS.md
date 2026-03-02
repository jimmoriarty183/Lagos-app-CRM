# Deploy diagnostics (Vercel)

## 1) Redeploy without cache
Use **Redeploy → Redeploy without cache** in Vercel UI.

Expected: if error still appears after `Build Completed in /vercel/output` and only on `Deploying outputs...`, this indicates platform upload/deploy stage issue (not Next build step).

## 2) Build mode
This project forces webpack build on Vercel:

- `vercel.json` → `buildCommand: npm run build:webpack`
- local equivalent: `npm run build:webpack`

## 3) Output inspection
Run after build:

```bash
npm run inspect:output
```

It prints:
- total output size
- `.next/static` size
- `.next/server` size
- file counts
- top `.vercel/output/functions` by size (if present)

## 4) Vercel Support template

Subject: `Internal error after successful build at Deploying outputs`

Body:

```text
Hi Vercel team,

We have a reproducible deploy failure where build completes successfully, but deployment fails at:

Build Completed in /vercel/output [...]
Deploying outputs...
Error: We encountered an internal error. Please try again.

Project: <project-name>
Team: <team-name>
Failed deployment ID: <deployment-id>
Region shown in logs: iad1

What we already tested:
1) Redeploy without cache
2) Force webpack build (no Turbopack): next build --webpack
3) Middleware minimized and also tested with allow-all middleware
4) Verified output sizes and function sizes are normal

Could you inspect server-side deploy logs for this deployment ID and confirm root cause?

Thanks.
```

## 5) Workarounds if issue persists
- Duplicate the Vercel project and deploy same branch there.
- Trigger deployment from a fresh branch commit.
- Change team/project default region and redeploy.
- If monorepo: set explicit Root Directory.
