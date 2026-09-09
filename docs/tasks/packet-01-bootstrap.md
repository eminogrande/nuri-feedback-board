# Task Packet 01 — Bootstrap Next.js project + design system

- Repo: `eminogrande/nuri-feedback-board` (local: `~/Developer/nuri-feedback-board`)
- Base branch: `main`   Base SHA: `bc5e938`
- Target branch: `hermes-subagent/bootstrap`
- Allowed paths: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json`, `src/**/*`, `public/**/*`, `.github/workflows/ci.yml`, `README.md`, `CHANGELOG.md`
- Protected (do not edit): `docs/architecture.md`, `docs/payout-flow.md`
- Verify: `pnpm install && pnpm run lint && pnpm run build`
- Done when: `pnpm run build` passes and `src/app/page.tsx` renders a minimal hello-world page.
- Out of scope: GitHub API calls, auth, payout action, board/roadmap data fetching.
- Forbidden: merge, deploy, tag, force-push, mainnet/funds, docker, secrets.

## What to build

1. Initialize Next.js 15 project with App Router, TypeScript, Tailwind CSS, and shadcn/ui.
2. Configure shadcn/ui with the neutral/base color (light mode only; dark mode disabled per product preference).
3. Add minimal design tokens in Tailwind config matching Nuri's clean public-web style:
   - bg: `#ffffff`
   - text: `#111827`
   - muted: `#6b7280`
   - border: `#e5e7eb`
   - accent: `#beaaff` (lilac)
   - accent text: `#381b6a`
4. Create root layout with a simple header (logo text "Nuri Feedback", nav links: Roadmap, Give Feedback) and footer.
5. Create placeholder pages:
   - `/` — landing hero with title + subtitle + two CTAs (Give feedback, View roadmap).
   - `/roadmap` — placeholder grid, data will come later.
   - `/feedback` — placeholder submit form layout.
6. Add a `src/lib/env.ts` module that validates required env vars at runtime with zod:
   - `GITHUB_APP_ID`
   - `GITHUB_PRIVATE_KEY`
   - `GITHUB_PROJECT_ID`
   - `GITHUB_REPO`
   - `NEXT_PUBLIC_GITHUB_REPO`
   - `NEXT_PUBLIC_GITHUB_PROJECT_URL`
   - `NURI_PASSKEY_ORIGIN`
   - `ARKADE_MNEMONIC`
   - `ARKADE_SERVER_URL`
7. Add a CI workflow that runs `pnpm install`, `pnpm run lint`, `pnpm run build` on PR/push.
8. Add `CHANGELOG.md` with an `## Unreleased` heading and an entry for this packet.

## Acceptance

- `pnpm run build` exits 0.
- `pnpm run lint` exits 0 (or no new errors if rules are relaxed).
- `http://localhost:3000` shows the landing page with header, hero, CTAs.
