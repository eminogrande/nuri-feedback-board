# Task Packet 03 — GitHub Issues/Projects API integration

- Repo: `eminogrande/nuri-feedback-board` (local: `~/Developer/nuri-feedback-board`)
- Base branch: `main`   Base SHA: `abaa470`
- Target branch: `hermes-subagent/github-api`
- Allowed paths: `src/lib/types.ts`, `src/lib/github.ts`, `src/lib/data.ts`, `src/app/api/**/*`, `CHANGELOG.md`
- Protected: `package.json` version, `docs/**/*.md`, `src/lib/env.ts`, CI workflow, `.github/workflows/*`, `src/app/**/*`, `src/components/**/*` (except `src/lib/data.ts`)
- Verify: `pnpm install && pnpm run build && npx tsc --noEmit -p tsconfig.json`
- Done when: The API routes work and `src/lib/data.ts` returns real issues from GitHub.
- Out of scope: UI pages (handled by packet 02), auth, payout.
- Forbidden: merge, deploy, tag, force-push, mainnet/funds, docker, secrets.

## What to build

1. **`src/lib/types.ts`** — define TypeScript types:
   - `FeedbackItem { id, number, title, body, category, status, votes, createdAt, author }`
   - `Category = 'feature' | 'bug' | 'improvement'`
   - `Status = 'New' | 'Under Review' | 'Planned' | 'In Progress' | 'Accepted' | 'Paid' | 'Dismissed'`
   - `CreateFeedbackInput { title, description, category, author }`

2. **`src/lib/github.ts`** — GitHub App auth via `@octokit/auth-app` or `@octokit/rest`, plus helpers:
   - `getInstallationOctokit()` — authenticate as GitHub App.
   - `listFeedbackItems()` — fetch open issues from `GITHUB_REPO` with label `feedback`, parse labels into `category` and status from project.
   - `getProjectItems()` — fetch project items via GraphQL and map issue number to status.
   - `createFeedbackIssue(input)` — create issue with labels `feedback`, `category:<category>`, body containing author info; add to project under `New`.
   - `getFeedbackIssue(number)` — fetch single issue.
   - `addIssueComment(number, body)`.
   - `moveProjectItemToStatus(itemId, statusName)`.

3. **`src/lib/data.ts`** — data access layer:
   - `getFeedbackItems(): Promise<FeedbackItem[]>` — calls `listFeedbackItems()` and `getProjectItems()`, merges status.
   - `getFeedbackItem(id: string): Promise<FeedbackItem | null>`.
   - `createFeedbackItem(input): Promise<FeedbackItem>`.

4. **API routes**
   - `GET /api/feedback` — return `getFeedbackItems()`.
   - `GET /api/feedback/[id]` — return `getFeedbackItem(id)`.
   - `POST /api/feedback` — accept `{ title, description, category, author }`, validate, call `createFeedbackItem`, return the new item.
   - `POST /api/feedback/[id]/vote` — placeholder: add a 👍 reaction to the issue and return new count (re-fetch).

5. **Labels convention**
   - Categories: `category:feature`, `category:bug`, `category:improvement`
   - Status source of truth: GitHub Project column name.

## Acceptance

- `pnpm run build` passes.
- `npx tsc --noEmit` passes.
- `GET /api/feedback` returns issues from the configured repo (requires env vars + GitHub App).
- `POST /api/feedback` creates an issue and adds it to the project.
