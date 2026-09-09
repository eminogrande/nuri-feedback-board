# Task Packet 05 — Arkade payout GitHub Action

- Repo: `eminogrande/nuri-feedback-board` (local: `~/Developer/nuri-feedback-board`)
- Base branch: `main` (will merge on top of packet-01 branch)
- Target branch: `hermes-subagent/payout-action`
- Allowed paths: `.github/workflows/payout.yml`, `scripts/payout.ts`, `src/lib/payout.ts`, `src/lib/arkade.ts`, `CHANGELOG.md`
- Protected: `package.json` version, CI workflow, docs
- Verify: `pnpm exec tsc --noEmit scripts/payout.ts`
- Done when: Moving an issue to the `Accepted` column triggers the workflow, which sends Bitcoin and posts the txid as a comment.
- Out of scope: UI changes, GitHub API read paths (reuse packet-03 helpers), passkey auth.
- Forbidden: merge, deploy, tag, force-push, mainnet/funds actions that cannot be verified in testnet first, docker, secrets.

## What to build

1. **`src/lib/arkade.ts`**
   - Load wallet from `ARKADE_MNEMONIC` and `ARKADE_SERVER_URL` env vars using `@arkade-os/sdk`:
     ```ts
     import { MnemonicIdentity, Wallet } from "@arkade-os/sdk";
     const identity = MnemonicIdentity.fromMnemonic(process.env.ARKADE_MNEMONIC);
     const wallet = await Wallet.create({ identity, arkServerUrl: process.env.ARKADE_SERVER_URL });
     ```
   - `sendPayout({ address, amountSats })` returns `{ txid }` via `wallet.sendBitcoin({ address, amount })`.

2. **`src/lib/payout.ts`**
   - `parsePayoutInfo(issueBody: string)` extracts the payout destination and amount from the issue body.
   - `recordPayoutProof(issueNumber, txid, amountSats)` calls the GitHub helper from packet-03 to add a comment and move the project item to `Paid`.

3. **`scripts/payout.ts`**
   - CLI entrypoint used by the GitHub Action.
   - Inputs via env vars: `ISSUE_NUMBER`, `ISSUE_BODY`, `PROJECT_ITEM_ID`.
   - Idempotency: check issue comments for an existing `Payout proof:` comment; if found, exit 0.
   - Parse destination + amount, call `sendPayout`, post proof comment, update project status to `Paid`.

4. **`.github/workflows/payout.yml`**
   - Trigger: `issues` event? Better: project status changes emit `project_v2_item` webhook, but GitHub Actions cannot directly listen to project field changes.
   - Use a scheduled workflow (every 5 minutes) or a repository webhook receiver.
   - For MVP, use `workflow_dispatch` + scheduled poll: query project items in `Accepted` status, run payout script for each.
   - Alternative: trigger on `issues` `labeled` event when label `status:Accepted` is added.
   - Choose one reliable trigger and document it.

## Payout destination format

Issue body should contain:
```
Payout destination: ark1...
Amount (sats): 50000
```

## Acceptance

- `pnpm exec tsc --noEmit scripts/payout.ts` passes.
- Workflow file is syntactically valid (`gh workflow view payout` or GitHub UI shows it).
- A test run on regtest/testnet with a funded wallet sends sats and posts the txid comment.
