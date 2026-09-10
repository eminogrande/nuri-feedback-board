# Changelog

## Unreleased

### Added
- GitHub-backed feedback list, detail, create and App-reaction vote API routes; project Status values are joined by repository and issue number, with paginated reads and internal/PR filtering (packet 03, Hermes/Athos).
- Server-only GitHub App installation authentication, issue/comment helpers, explicit project `New` assignment, input validation, and partial-write errors that preserve the created issue identity instead of encouraging duplicate submissions.
- Offline HTTP contract checks: `node --test src/app/api/feedback/feedback.test.mjs`. Live GitHub reads/writes still require an approved App installation, Issues and Projects access, the configured labels (`feedback`, `public`, `category:*`), and a ProjectV2 `Status` field with the declared options.
- Packet 03 integration notes: API `id` is the decimal issue number; author is an unverified display string; votes are a single GitHub App's `+1`, not per-user voting. Auth and payout remain separate packets. Native Node crypto/fetch implement the installation client because the packet excludes dependency-file edits; no Octokit dependency was added. Build works without secrets; live App acceptance is not yet verified.
- Bootstrap Next.js 15 project with App Router, TypeScript, Tailwind CSS, and shadcn/ui
- Design tokens matching Nuri's clean public-web style (light mode only)
- Root layout with header (logo, Roadmap, Give Feedback nav) and footer
- Placeholder pages: `/` landing hero, `/board`, `/roadmap`, `/feedback`
- `src/lib/env.ts` with zod validation for required environment variables
- CI workflow running install, lint, and build on PR/push
