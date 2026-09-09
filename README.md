# Nuri Feedback Board

Open-source public feedback board and roadmap for Nuri.

- Collect feature requests, bug reports, and improvement suggestions.
- Public roadmap synced from a GitHub Project.
- One human acceptance step before anything is paid.
- Automatic Bitcoin payout via Arkade the moment an item is accepted.

## How it works

1. A user signs in with their Nuri passkey (mobile or desktop).
2. They submit feedback through a minimal public website.
3. The submission creates a GitHub Issue in this repo and lands in the GitHub Project under **New**.
4. The Nuri team triages the item. Moving it to **Accepted** triggers an automatic Arkade payout.
5. The payout transaction ID is posted back to the GitHub Issue as proof.

## Repos / live surfaces

| Surface | URL |
|---|---|
| Source code | `https://github.com/eminogrande/nuri-feedback-board` |
| Public feedback site | `https://feedback.nuri.com` (planned) |
| GitHub Project (public kanban) | linked in repo Projects tab |

## Tech stack

- Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- GitHub Issues + GitHub Project as the source of truth
- GitHub Actions for the payout automation
- Arkade TypeScript SDK (`@arkade-os/sdk`) for Bitcoin payouts
- WebAuthn / Nuri passkey for authentication

## Status labels

- `New` — just submitted
- `Under Review` — team is looking at it
- `Planned` — accepted for the roadmap, not started
- `In Progress` — being built
- `Accepted` — accepted for payout, payment triggered automatically
- `Paid` — payout confirmed on-chain
- `Dismissed` — declined with a reason

## Payouts

A funded Arkade wallet sends Bitcoin when an issue reaches `Accepted`. The destination is taken from the submitter's Nuri profile (Arkade address or Lightning invoice). The transaction proof is posted as a GitHub comment.

## Development

```bash
pnpm install
pnpm dev
```

## License

MIT
