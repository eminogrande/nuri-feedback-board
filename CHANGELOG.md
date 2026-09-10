# Changelog

## Unreleased

### Added
- Public feedback preview by Athos: landing categories and three-step guide, searchable/filterable board, four-column roadmap, category-aware submission form, and linked feedback details.
- Reusable feedback cards, category/status badges, preview vote buttons, roadmap columns, and local shadcn-style UI primitives using existing dependencies.
- Mobile-first navigation, 17px base typography, keyboard focus states, and explicit sample-data/sign-in notices; submissions and votes are not persisted in this UI-only packet.
- Bootstrap Next.js 15 project with App Router, TypeScript, Tailwind CSS, and shadcn/ui
- Design tokens matching Nuri's clean public-web style (light mode only)
- Root layout with header (logo, Roadmap, Give Feedback nav) and footer
- Placeholder pages: `/` landing hero, `/board`, `/roadmap`, `/feedback`
- `src/lib/env.ts` with zod validation for required environment variables
- CI workflow running install, lint, and build on PR/push
