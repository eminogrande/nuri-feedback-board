# Changelog

## Unreleased

### Added
- Passkey sign-in at `/login`, signed HTTP-only sessions, username/logout UI, and authentication for feedback POSTs. Assertions require a trusted, operator-provisioned Nuri public-key registry; unknown credentials fail closed. Feedback usernames are self-declared, not payout identities. See `src/app/api/auth/README.md` for setup and verification.
- Bootstrap Next.js 15 project with App Router, TypeScript, Tailwind CSS, and shadcn/ui
- Design tokens matching Nuri's clean public-web style (light mode only)
- Root layout with header (logo, Roadmap, Give Feedback nav) and footer
- Placeholder pages: `/` landing hero, `/board`, `/roadmap`, `/feedback`
- `src/lib/env.ts` with zod validation for required environment variables
- CI workflow running install, lint, and build on PR/push
