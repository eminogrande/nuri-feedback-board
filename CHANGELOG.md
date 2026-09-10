# Changelog

## Unreleased

### Added
- Bootstrap Next.js 15 project with App Router, TypeScript, Tailwind CSS, and shadcn/ui.
- Design tokens matching Nuri's clean public-web style (light mode only).
- Root layout with header (logo, Roadmap, Give Feedback nav) and footer.
- Public pages: `/` landing hero, `/board`, `/roadmap`, `/feedback`, `/feedback/[id]`.
- `src/lib/env.ts` with zod validation for required environment variables.
- CI workflow running install, lint, and build on PR/push.
- GitHub-backed feedback list, detail, create and vote API routes; project Status values joined by repository and issue number.
- Server-only GitHub App installation authentication, issue/comment helpers, and project `New` assignment.
- Offline HTTP contract checks for feedback API.
- Passkey sign-in at `/login`, signed HTTP-only sessions, username/logout UI, and authentication for feedback POSTs.
- Testnet-only Arkade feedback payouts: manual dispatch and polling of Accepted project items, Bitcoin proof comments, and verified Paid status updates.
- Payout replay protection via verified pending comments, trusted proof comments, and workflow concurrency lock.
- Offline payout regression check: `pnpm exec tsx scripts/payout.ts --self-test`.
