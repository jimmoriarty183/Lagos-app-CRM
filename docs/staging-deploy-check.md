# Staging deploy check

This commit is an intentional no-op documentation change used to trigger a fresh deployment from the `staging` branch for verification.

Created: 2026-03-27 (UTC)
Updated: 2026-03-27 17:25 UTC

## Why deploy may be "missing"

In Vercel, deployments from `staging` are shown as **Preview** (not Production) unless the project Production Branch is explicitly set to `staging` in Vercel project settings.

If you need a fresh deploy entry, push this commit to `staging` and refresh the Deployments page with the branch filter set to `staging`.

## Redeploy modal quick check

If you see `Choose Environment: Preview` and the selected source shows branch `staging`, that is the correct flow for a staging deploy.
Click **Redeploy** to create a new Preview deployment from the current `staging` source commit.

## `test.ordo.uno` domain behavior

- `test.ordo.uno` is attached by Vercel as a custom **Preview** domain when the deployment is **Ready**.
- If deployment status is **Error** / build failed, the alias may not be attached to that failed deployment card.
- After fixing build errors and redeploying the same `staging` commit range, `test.ordo.uno` should appear again on the successful deployment.
