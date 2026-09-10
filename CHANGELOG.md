# Changelog

## Unreleased

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
