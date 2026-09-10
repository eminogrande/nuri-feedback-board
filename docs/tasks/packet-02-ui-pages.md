# Task Packet 02 — Public UI pages and components

- Repo: `eminogrande/nuri-feedback-board` (local: `~/Developer/nuri-feedback-board`)
- Base branch: `main`   Base SHA: `b848ec2`
- Target branch: `hermes-subagent/ui-pages`
- Allowed paths: `src/app/**/*`, `src/components/**/*`, `src/lib/utils.ts`, `public/**/*`, `CHANGELOG.md`
- Protected: `package.json` version, `docs/**/*.md`, `src/lib/env.ts`, CI workflow, `.github/workflows/*`
- Verify: `pnpm install && pnpm run lint && pnpm run build`
- Done when: The public pages render with the Alby-like minimal layout; build passes.
- Out of scope: Real data fetching (use static sample data), auth logic, API routes, payout code.
- Forbidden: merge, deploy, tag, force-push, mainnet/funds, docker, secrets.

## What to build

Build clean, minimal public pages inspired by `https://feedback.getalby.com/`. Keep light-only, 17px+ base, no horizontal scroll on mobile.

### Components (`src/components/`)

- `FeedbackCard.tsx` — title, category badge, status badge, vote button, comment count.
- `StatusBadge.tsx` — maps status names to colors.
- `CategoryBadge.tsx` — feature/bug/improvement.
- `VoteButton.tsx` — upvote button with count.
- `RoadmapColumn.tsx` — column header + list of FeedbackCards.
- `SubmitForm.tsx` — category select, title input, description textarea, submit button.

### Pages (`src/app/`)

1. **Landing `/`**
   - Hero: "Help shape Nuri" + subline + two CTAs (Give feedback, View roadmap).
   - Category cards linking to `/feedback?category=<type>`.
   - 3-step "How it works" block.

2. **Board `/board`**
   - Header tabs/categories, search input.
   - List of `FeedbackCard`s using static sample data.
   - Sticky "Give feedback" button.

3. **Roadmap `/roadmap`**
   - Kanban columns: `Under Review`, `Planned`, `In Progress`, `Done`.
   - Cards show title, category, votes.

4. **Submit `/feedback`**
   - `SubmitForm` with category, title, description.
   - Placeholder sign-in notice (auth will be wired in packet 04).
   - Submit button disabled until title and description non-empty.

5. **Detail `/feedback/[id]`**
   - Title, status badge, description, vote button.
   - Use static sample data keyed by id.

### Notes

- Tailwind only, no custom CSS files.
- Use shadcn/ui components where appropriate (Select, Input, Textarea, Button, Card, Badge).
- Add sample data in `src/lib/sample-data.ts`.
