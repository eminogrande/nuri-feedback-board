# Task Packet 05 — Arkade payout GitHub Action

- Repo: `eminogrande/nuri-feedback-board` (local: `~/Developer/nuri-feedback-board`)
- Base branch: `main`   Base SHA: `b848ec2`
- Target branch: `hermes-subagent/payout-action`
- Allowed paths: `.github/workflows/payout.yml`, `scripts/payout.ts`, `src/lib/arkade.ts`, `src/lib/payout.ts`, `CHANGELOG.md`
- Protected: `package.json` version, `docs/**/*.md`, `src/lib/env.ts`, CI workflow (ci.yml), `src/app/**/*`, `src/components/**/*`
- Editable by this packet: `src/lib/github.ts` (only to add `addIssueComment` and `moveProjectItemToStatus` if not already present)
- Verify: `pnpm install && npx tsc --noEmit -p tsconfig.json`
- Done when: The payout script compiles and the workflow file is valid.
- Out of scope: UI changes, passkey auth.
- Forbidden: merge, deploy, tag, force-push, mainnet/funds actions that cannot be tested on testnet first, docker, secrets.

## What to build

1. **`src/lib/arkade.ts`**
   - Load wallet from `ARKADE_MNEMONIC` and `ARKADE_SERVER_URL` using `@arkade-os/sdk`:
     ```ts
     import { MnemonicIdentity, Wallet } from "@arkade-os/sdk";
     const identity = MnemonicIdentity.fromMnemonic(process.env.ARKADE_MNEMONIC);
     const wallet = await Wallet.create({ identity, arkServerUrl: process.env.ARKADE_SERVER_URL });
     ```
   - `sendPayout({ address, amountSats })` returns `{ txid }` via `wallet.sendBitcoin({ address, amount })`.

2. **`src/lib/payout.ts`**
   - `parsePayoutInfo(issueBody: string)` extracts payout destination and amount from issue body:
     ```
     Payout destination: ark1...
     Amount (sats): 50000
     ```
   - `recordPayoutProof(issueNumber, txid, amountSats)` uses `src/lib/github.ts` helpers to add a comment and move the project item to `Paid`.

3. **`scripts/payout.ts`**
   - CLI entrypoint for the GitHub Action.
   - Inputs via env vars: `ISSUE_NUMBER`, `ISSUE_BODY`, `PROJECT_ITEM_ID`.
   - Idempotency: check issue comments for an existing `Payout proof:` line; if found, exit 0.
   - Parse destination + amount, call `sendPayout`, post proof comment, update project status to `Paid`.
   - On failure, post a comment explaining the error and exit 1.

4. **`.github/workflows/payout.yml`**
   - Trigger: `workflow_dispatch` with inputs `issue_number`, `issue_body`, `project_item_id`.
   - Also run on a schedule (every 5 minutes) to poll project items in `Accepted` and trigger payouts.
   - Job steps: checkout, setup Node + pnpm, install, run `npx tsx scripts/payout.ts`.
   - Secrets: `ARKADE_MNEMONIC`, `ARKADE_SERVER_URL`, `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_PROJECT_ID`, `GITHUB_REPO`.

## Acceptance

- `npx tsc --noEmit` passes.
- `gh workflow view payout` (or GitHub UI) shows a valid workflow.
- A test run on testnet/regtest with a funded wallet sends sats and posts the txid comment.
