# Changelog

## 2026-10-14 — [RELEASE] v0.1.0 — hermes-agent for emino

First tagged release. State of `main` at HEAD `00524d4b`.

- Public board, roadmap, list and detail pages read live GitHub Issues and Project v2 status.
- Passkey sign-in (`/api/auth/*`, `/api/me`), signed HTTP-only `nuri_session` cookie; POST `/api/feedback/*` requires session and trusted origin.
- Feedback create and vote API backed by a GitHub App (issues, +1 reactions, project `New` assignment).
- Testnet-only Arkade payouts via `payout.yml` (schedule every 5 min or manual dispatch), opt-in via `PAYOUT_ENABLED`.
- Deployment scaffolding for `feedback.nuri.com`: Vercel or `scripts/deploy.sh` with PM2 and nginx. Live deployment state UNVERIFIED.
- Known limits (from the entries below): GitHub reactions are not per-person votes; real sign-in needs an operator-provisioned passkey registry.

## Commit history

### 2026-09-10
- `00524d4b` docs: deployment scaffolding (`scripts/deploy.sh`, PM2 `ecosystem.config.js`, nginx vhost), `.env.example`, README deployment section.
- `cc1941e5` feat(ui): board, roadmap, detail and submit form now use the live feedback and `/api/me` APIs (#7).
- `a1b4dc8d` docs: added task packet 06 (wire UI).
- `fbc95614` Integration (#6): GitHub Issues/Projects API, passkey auth with middleware, Arkade payout script and workflow merged into main.
- `ffe8d0b6` docs: task packets point at base SHA `abaa470`.
- `abaa470b` chore: `worktrees/` ignored by git.
- `5d6fcdc3` docs: task packets updated for parallel wave 2.
- `b848ec21` feat: Next.js 15 project bootstrapped with design system and CI workflow (#1).

### 2026-09-09
- `c9a34590` docs: task packets for bootstrap, UI, GitHub API, passkey auth, payout.
- `bc5e938f` docs: initial README, architecture doc and MIT license (first commit).

## Unreleased (pre-v0.1.0 notes, now included in v0.1.0)

### Changed
- Connected the public board, roadmap, and detail pages to uncached feedback API reads, with loading, error, empty, and missing-item states. All seven GitHub project statuses retain their original names.
- Connected the submission form to authenticated issue creation, preserving drafts on errors, navigating to the returned issue number, and preventing duplicate submissions after a partial project-sync failure.
- Added a shared `/api/me` session state for the header, sign-in, submission, and detail-page voting. Votes are persisted through the API and reloaded; board and roadmap vote links open the detail page rather than simulating local votes.
- Kept the existing server data layer, API routes, and preview-only composite components unchanged. Live pages reuse the existing UI primitives because the preview composites assume unsupported statuses, fabricated comment counts, and local-only voting.
- Integration limitations remain: the API requires a display-only `author` field, GitHub App reactions are not per-person voting, and real Nuri sign-in needs an operator-provisioned trusted passkey registry. Production GitHub issue creation has not been exercised by this UI change. Auth and feedback service configuration is required before live use. Implemented by Athos for task packet 06.

### Added
- Bootstrap Next.js 15 project with App Router, TypeScript, Tailwind CSS, and shadcn/ui.
- Design tokens matching Nuri's clean public-web style (light mode only).
- Root layout with header (logo, Roadmap, Give Feedback nav) and footer.
- Public pages: `/` landing hero, `/board`, `/roadmap`, `/feedback`, `/feedback/[id]`.
- Reusable feedback cards, category/status badges, vote buttons, roadmap columns, and submission form.
- Mobile-first navigation, 17px base typography, keyboard focus states, and sample-data notices.
- `src/lib/env.ts` with zod validation for required environment variables.
- CI workflow running install, lint, and build on PR/push.
- GitHub-backed feedback list, detail, create and vote API routes; project Status values joined by repository and issue number.
- Server-only GitHub App installation authentication, issue/comment helpers, and project `New` assignment.
- Offline HTTP contract checks for feedback API.
- Passkey sign-in at `/login`, signed HTTP-only sessions, username/logout UI, and authentication for feedback POSTs.
- Testnet-only Arkade feedback payouts: manual dispatch and polling of Accepted project items, Bitcoin proof comments, and verified Paid status updates.
- Payout replay protection via verified pending comments, trusted proof comments, and workflow concurrency lock.
- Offline payout regression check: `pnpm exec tsx scripts/payout.ts --self-test`.
