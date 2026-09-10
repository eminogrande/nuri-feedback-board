# Nuri Feedback Board

A public feedback board and roadmap that mirrors a GitHub Project kanban board on a clean public website.

- Collect feature requests, bug reports, and improvement suggestions.
- Public roadmap synced from a GitHub Project.
- One human acceptance step before anything is paid.
- Automatic Bitcoin payout via Arkade the moment an item is accepted.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui (neutral/light theme)
- Zod for environment validation
- GitHub Issues + GitHub Project as source of truth
- Nuri passkey authentication
- Arkade TypeScript SDK for Bitcoin payouts

## Getting Started

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

Required:
- `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_PROJECT_ID`, `GITHUB_REPO` — GitHub App for issue/project access.
- `AUTH_SECRET`, `NURI_PASSKEY_ORIGIN` — passkey session signing and allowed origin.
- `ARKADE_MNEMONIC`, `ARKADE_SERVER_URL` — funded wallet for payouts.

See `docs/architecture.md` for details.

## Deployment

### Vercel (quickest)

1. Import `eminogrande/nuri-feedback-board` in Vercel.
2. Add the environment variables from `.env.example`.
3. Add a custom domain `feedback.nuri.com` (requires DNS CNAME).

### Self-hosted (nuri.com server)

1. Ensure Node.js >= 20, pnpm, PM2, and nginx are installed.
2. Copy `.env.example` to `/opt/nuri-feedback-board/.env.production` and fill it.
3. Run `scripts/deploy.sh` from this repo (adjust `DEPLOY_HOST` as needed).
4. Add the nginx config from `scripts/nginx-feedback.nuri.com.conf` and request an SSL cert:
   ```bash
   certbot --nginx -d feedback.nuri.com
   ```

## Scripts

- `pnpm run dev` — Start development server
- `pnpm run build` — Build for production
- `pnpm run lint` — Run ESLint
- `pnpm run start` — Start production server
- `pnpm exec tsx scripts/payout.ts --self-test` — Offline payout regression check
