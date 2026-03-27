# Staging deploy check

This commit is an intentional no-op documentation change used to trigger a fresh deployment from the `staging` branch for verification.

Created: 2026-03-27 (UTC)
Updated: 2026-03-27 16:35 UTC

## Why deploy may be "missing"

In Vercel, deployments from `staging` are shown as **Preview** (not Production) unless the project Production Branch is explicitly set to `staging` in Vercel project settings.

If you need a fresh deploy entry, push this commit to `staging` and refresh the Deployments page with the branch filter set to `staging`.
