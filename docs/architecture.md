# Architecture

## Goal

A public feedback board and roadmap that:
- mirrors a GitHub Project kanban board on a clean public website,
- authenticates users via Nuri passkey,
- creates GitHub Issues from submissions,
- pays Bitcoin automatically when an item is accepted.

## Components

```
┌────────────────────┐        ┌────────────────────┐
│  feedback.nuri.com │        │  GitHub Project    │
│  (Next.js website) │───────▶│  (public kanban)   │
└─────────┬──────────┘        └─────────┬──────────┘
          │                             │
          │ WebAuthn / Nuri passkey     │
          ▼                             │
┌────────────────────┐                  │
│  Nuri username     │                  │
│  + Arkade addr     │                  │
└────────────────────┘                  │
                                        │ move to Accepted
                                        ▼
                              ┌────────────────────┐
                              │  GitHub Actions    │
                              │  payout workflow   │
                              └─────────┬──────────┘
                                        │ Arkade SDK
                                        ▼
                              ┌────────────────────┐
                              │  Arkade wallet     │
                              │  (funded)          │
                              └────────────────────┘
```

## Data flow

### Submit feedback

1. User visits `feedback.nuri.com`.
2. Clicks "Sign in with Nuri passkey".
3. WebAuthn call with `rpId: "nuri.com"` uses the same passkey as the Nuri app.
4. Server verifies the assertion and resolves the Nuri username via the Nuri credential-hint endpoint (or PRF-derived wallet identifier).
5. User fills title, category, description.
6. Server creates a GitHub Issue via GitHub App token with labels `feedback`, `<category>`, and a body containing the username and payout destination.
7. The issue is automatically added to the configured GitHub Project under `New`.

### Triage

1. Team reviews items in the GitHub Project.
2. Moving an item to `Accepted` is the single human approval step.
3. A GitHub Actions workflow triggers on the status change.

### Payout

1. Workflow checks out the repo.
2. Reads the issue body for the submitter's Arkade address / Lightning invoice and the amount.
3. Loads the funded wallet from a GitHub secret (mnemonic or private key).
4. Calls `@arkade-os/sdk` to send Bitcoin.
5. Posts a comment with the transaction ID and amount as proof.
6. Moves the item to `Paid`.

## Public vs internal roadmap

- Public roadmap: items labeled `public` are fetched by the website.
- Internal roadmap: items labeled `internal` stay in GitHub Project but are not shown on the public site.
- Default for web submissions is `public`.

## Security notes

- The funded wallet key lives only in GitHub secrets.
- Payouts require the item to be in `Accepted` and to contain a valid payout destination.
- The workflow is idempotent: it checks for an existing `Paid` status before sending.
- Passkey verification happens server-side; the challenge is single-use and tied to the origin.

## Environment variables

| Variable | Purpose |
|---|---|
| `GITHUB_APP_ID` | GitHub App for issue/comment creation |
| `GITHUB_PRIVATE_KEY` | GitHub App private key |
| `GITHUB_PROJECT_ID` | Node ID of the GitHub Project |
| `GITHUB_REPO` | `owner/repo` for issue storage |
| `NURI_PASSKEY_ORIGIN` | Allowed origin for passkey verification |
| `ARKADE_MNEMONIC` | Seed for the payout wallet |
| `ARKADE_SERVER_URL` | `https://arkade.computer` |
| `NEXT_PUBLIC_GITHUB_REPO` | Public repo reference for links |
| `NEXT_PUBLIC_GITHUB_PROJECT_URL` | Public project URL |
