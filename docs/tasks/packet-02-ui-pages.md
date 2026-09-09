# Task Packet 02 — Public UI pages and components

- Repo: `eminogrande/nuri-feedback-board` (local: `~/Developer/nuri-feedback-board`)
- Base branch: `main` (will merge on top of packet-01 branch)
- Target branch: `hermes-subagent/ui-pages`
- Allowed paths: `src/app/**/*`, `src/components/**/*`, `src/lib/utils.ts`, `public/**/*`, `README.md`, `CHANGELOG.md`
- Protected: `package.json` version, `docs/architecture.md`, CI workflow file
- Verify: `pnpm install && pnpm run build`
- Done when: The three public pages render correctly with the Alby-like minimal layout.
- Out of scope: Data fetching, auth logic, API routes.
- Forbidden: merge, deploy, tag, force-push, mainnet/funds, docker, secrets.

## What to build

Build clean, minimal public pages inspired by `https://feedback.getalby.com/`.

### Pages

1. **Landing `/`**
   - Hero section: "Help shape Nuri" + subline + two prominent CTAs.
   - Category cards (Feature request, Bug report, Improvement suggestion) — each links to `/feedback?category=<type>`.
   - A "How it works" 3-step block.

2. **Feedback list `/board`**
   - Header with tabs/categories and a search input.
   - List of feedback cards: title, category badge, vote count, status badge, comment count.
   - Each card links to `/feedback/[id]` (detail page placeholder).
   - Sticky "Give feedback" button.

3. **Roadmap `/roadmap`**
   - Kanban-style columns: `Under Review`, `Planned`, `In Progress`, `Done`.
   - Cards show title, category, votes.
   - Minimal, no horizontal scroll on mobile.

4. **Submit `/feedback`**
   - Form: category select, title input, description textarea.
   - Show a sign-in notice if not authenticated (placeholder auth state).
   - Submit button disabled until title and description non-empty.

5. **Detail `/feedback/[id]`**
   - Placeholder page with title, status badge, description, vote button.

### Components

- `FeedbackCard`
- `StatusBadge` — maps status names to colors
- `CategoryBadge`
- `VoteButton`
- `RoadmapColumn`
- `SubmitForm`

### Notes

- Use Tailwind only; no custom CSS files.
- Keep text large (min 17px base).
- Use the accent lilac sparingly for CTAs.
