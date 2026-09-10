# Changelog

## Unreleased

### Added
- Testnet-only Arkade feedback payouts: manual dispatch and five-minute polling of Accepted project items, Bitcoin proof comments, and verified Paid status updates. The workflow starts disabled; set repository variable `PAYOUT_ENABLED=true` only after configuring the `payout-testnet` environment, the six payout secrets, and a GitHub App installation with Issues write and Projects write access to the configured repository/project.
- Payout replay protection uses a verified GitHub App pending comment before sending, trusted proof comments, and a shared workflow concurrency lock. A timeout or failed proof write leaves the pending marker in place: a maintainer must reconcile wallet history before removing it or posting the missing proof. This is fail-closed recovery, not an exactly-once payment guarantee across GitHub and Arkade.
- Offline regression check: `pnpm exec tsx scripts/payout.ts --self-test`. No funded testnet/regtest payment has been executed for this change; mainnet is deliberately unavailable. Existing user-editable issue payout fields are not an immutable approval snapshot, so enabling mainnet requires a separate approval-integrity design and funded testnet proof.
- Bootstrap Next.js 15 project with App Router, TypeScript, Tailwind CSS, and shadcn/ui
- Design tokens matching Nuri's clean public-web style (light mode only)
- Root layout with header (logo, Roadmap, Give Feedback nav) and footer
- Placeholder pages: `/` landing hero, `/board`, `/roadmap`, `/feedback`
- `src/lib/env.ts` with zod validation for required environment variables
- CI workflow running install, lint, and build on PR/push
