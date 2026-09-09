# Task Packet 03 — GitHub Issues/Projects API integration

- Repo: `eminogrande/nuri-feedback-board` (local: `~/Developer/nuri-feedback-board`)
- Base branch: `main` (will merge on top of packet-01 branch)
- Target branch: `hermes-subagent/github-api`
- Allowed paths: `src/lib/github.ts`, `src/lib/types.ts`, `src/app/api/**/*`, `src/app/board/**/*`, `src/app/roadmap/**/*`, `src/app/feedback/**/*`, `CHANGELOG.md`
- Protected: `package.json` version, CI workflow, docs
- Verify: `pnpm install && pnpm run build && pnpm run check`
- Done when: `/board` and `/roadmap` display real issues from the configured GitHub repo/project; submitting the form creates a real issue.
- Out of scope: Payout action, passkey auth, internal/public filtering.
- Forbidden: merge, deploy, tag, force-push, mainnet/funds, docker, secrets.

## What to build

1. **`src/lib/types.ts`** — define TypeScript types:
   - `FeedbackItem { id, number, title, body, category, status, votes, createdAt, author }`
   - `RoadmapColumn { id, name, items: FeedbackItem[] }`
   - `Category = 'feature' | 'bug' | 'improvement'`
   - `Status = 'New' | 'Under Review' | 'Planned' | 'In Progress' | 'Accepted' | 'Paid' | 'Dismissed'`

2. **`src/lib/github.ts`** — GitHub App authentication via `@octokit/app` or `@octokit/auth-app`, plus helpers:
   - `getIssues()` — fetch open issues from `GITHUB_REPO`, parse labels into `category` and `status`.
   - `getProjectItems()` — fetch project items via GraphQL (`GITHUB_PROJECT_ID`), map to statuses.
   - `createIssue({ title, body, category })` — create issue with labels `feedback`, `category`, add it to the configured project under `New`.
   - `addComment(issueNumber, body)` — post a comment.
   - `updateProjectItemStatus(itemId, status)` — move project item to a named column.

3. **API routes**
   - `POST /api/feedback` — accept `{ title, description, category, author }`, call `createIssue`, return `{ issueNumber, url }`.
   - `GET /api/feedback` — return list of issues (server-side caching optional, 60s).
   - `GET /api/feedback/[id]` — return single issue.
   - `POST /api/feedback/[id]/vote` — placeholder, increments a counter stored in issue reactions for now.

4. **Wire up pages**
   - `/board` — fetch via `GET /api/feedback` and render `FeedbackCard` list.
   - `/roadmap` — fetch via `GET /api/feedback`, group by `status` into columns.
   - `/feedback` form — `POST /api/feedback` on submit, redirect to `/feedback/[id]`.

5. **Labels convention**
   - Categories: `category:feature`, `category:bug`, `category:improvement`
   - Statuses: project column name is source of truth; fallback label `status:<name>`.

## Acceptance

- `pnpm run build` passes.
- A test issue created via the form appears in the GitHub repo and project.
- `/board` lists it; `/roadmap` places it in the correct column.
