# Task Packet 06 — Wire UI to live data and auth

- Repo: `eminogrande/nuri-feedback-board` (local: `~/Developer/nuri-feedback-board`)
- Base branch: `main`   Base SHA: `fbc9561`
- Target branch: `hermes-subagent/wire-ui`
- Allowed paths: `src/app/board/page.tsx`, `src/app/roadmap/page.tsx`, `src/app/feedback/page.tsx`, `src/app/feedback/[id]/page.tsx`, `src/app/layout.tsx`, `src/components/auth.tsx`, `src/components/SubmitForm.tsx`, `src/lib/data.ts`, `CHANGELOG.md`
- Protected: `package.json` version, `docs/**/*.md` (except this file), CI workflow, `src/lib/env.ts`, `src/lib/github.ts`, `src/lib/types.ts`, `src/lib/passkey.ts`, `src/lib/auth.ts`, `src/middleware.ts`, `src/app/api/**/*`, `src/lib/arkade.ts`, `src/lib/payout.ts`, `scripts/payout.ts`, `.github/workflows/payout.yml`
- Verify: `pnpm install && pnpm run lint && pnpm run build && npx tsc --noEmit -p tsconfig.json`
- Done when: The public pages display real feedback from GitHub and the submit form creates real issues for authenticated users.
- Out of scope: Payout logic, GitHub API internals, passkey internals.
- Forbidden: merge, deploy, tag, force-push, mainnet/funds, docker, secrets.

## What to build

1. **Data fetching**
   - Update `src/lib/data.ts` to export:
     - `getFeedbackItems()` — `fetch('/api/feedback', { cache: 'no-store' })` returning `FeedbackItem[]`.
     - `getFeedbackItem(id)` — `fetch('/api/feedback/${id}', { cache: 'no-store' })`.
   - Keep the existing GitHub-backed implementations in `src/lib/github.ts` for server-only use; the new browser-facing helpers can live in a new `src/lib/client-data.ts` if you prefer.

2. **Board page `/board`**
   - Replace sample data with `getFeedbackItems()`.
   - Keep category tabs and search; filter client-side.
   - Handle loading/error states simply.

3. **Roadmap page `/roadmap`**
   - Fetch items with `getFeedbackItems()`.
   - Group into columns by `status`.

4. **Submit page `/feedback`**
   - Replace the preview-only form with a real one.
   - Use `SubmitForm` but wire `onSubmit` to POST `/api/feedback` with `{ title, description, category }`.
   - Read auth state from `/api/me`. If not authenticated, show the sign-in button instead of the form.
   - On success, redirect to `/feedback/${issueNumber}`.

5. **Detail page `/feedback/[id]`**
   - Fetch real item with `getFeedbackItem(id)`.
   - Show not-found for missing items.
   - Vote button POSTs to `/api/feedback/${id}/vote` and refreshes.

6. **Header / layout**
   - Update `SiteNavigation` or `src/app/layout.tsx` to show the username when signed in and a "Sign in" link when not.
   - Use `/api/me` to determine auth state.

7. **Auth component polish**
   - Ensure `SignInButton` and `UserMenu` work with the existing `/api/auth/*` routes.

## Acceptance

- `pnpm run build` and `tsc --noEmit` pass.
- `/board` lists real issues from the configured GitHub repo (requires env vars + GitHub App).
- `/feedback` form creates a real issue when signed in.
- `/roadmap` shows real issues grouped by status.
