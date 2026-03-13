# CI Failure Analysis (GitHub Actions)

## Scope and limitations
- This local clone has **no git remotes configured** (`git remote -v` returned nothing), so I could not fetch GitHub-hosted check runs/logs directly.
- I reproduced likely CI jobs locally (`lint`, `build`) to identify deterministic failures.

## Reproduction summary
1. `npm run lint` exits with code 1 and reports **100 issues**.
2. Rule distribution from `npx eslint src --format json`:
   - `@typescript-eslint/no-explicit-any`: 84
   - `@typescript-eslint/no-unused-vars`: 7
   - `react-hooks/static-components`: 5
   - `react-hooks/set-state-in-effect`: 1
   - `react-hooks/purity`: 1
   - plus minor others
3. `npm run build` fails in this environment because `next/font` cannot fetch Google Fonts (`Geist`, `Geist Mono`) from `fonts.googleapis.com`.

## Root cause assessment
### Primary CI blocker (most likely)
- **Lint gate is red due to strict TypeScript + React hooks rules** inherited from `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Current source includes many `any` usages and several hook purity violations that are treated as errors.

### Secondary/conditional blocker
- Build font-download failure is reproducible here, but may be environment/network-specific.
- If your GitHub runners/network policies block external font fetches, this can also fail CI.

## Focused fix plan
1. **Unblock lint with minimal, safe typing pass**
   - Replace high-volume `any` with narrow local types in API routes (`src/app/api/**`) first.
   - For truly dynamic payloads, use `unknown` + runtime narrowing instead of `any`.
2. **Fix React hooks rule violations in hot files**
   - `react-hooks/set-state-in-effect`: refactor derived state synchronization in `InlineCells.tsx` to avoid direct `setState` in effect body.
   - `react-hooks/purity`: remove `Math.random()` usage during render in `sidebar.tsx` (precompute once outside render path or deterministic placeholder widths).
3. **Build hardening for fonts (if checks show build failures on Actions)**
   - Self-host Geist fonts under `public/fonts` and switch to `next/font/local`, or commit static fallbacks in layout.
4. **CI sequencing**
   - PR 1: lint-only stabilization until `npm run lint` is green.
   - PR 2: optional font hardening if Actions logs confirm `next/font` fetch instability.

## Suggested acceptance criteria
- `npm run lint` exits 0.
- `npm run build` exits 0 in CI.
- No temporary rule disables added globally in ESLint config.
