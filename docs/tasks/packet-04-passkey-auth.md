# Task Packet 04 — Nuri passkey authentication

- Repo: `eminogrande/nuri-feedback-board` (local: `~/Developer/nuri-feedback-board`)
- Base branch: `main`   Base SHA: `b848ec2`
- Target branch: `hermes-subagent/passkey-auth`
- Allowed paths: `src/lib/auth.ts`, `src/lib/passkey.ts`, `src/app/api/auth/**/*`, `src/components/auth.tsx`, `src/app/login/**/*`, `src/middleware.ts`, `CHANGELOG.md`
- Protected: `package.json` version, `docs/**/*.md`, CI workflow, `.github/workflows/*`, `src/app/page.tsx`, `src/app/board/page.tsx`, `src/app/roadmap/page.tsx`, `src/app/feedback/page.tsx`, `src/app/feedback/[id]/page.tsx`
- Editable by this packet: `src/lib/env.ts` (only to add `AUTH_SECRET` validation)
- Verify: `pnpm install && pnpm run lint && pnpm run build && npx tsc --noEmit -p tsconfig.json`
- Done when: A user can sign in with a Nuri passkey and the UI shows their username; POST /api/feedback is protected.
- Out of scope: Payout destination resolution, GitHub issue creation UI wiring (packet 03 handles API), public page design (packet 02).
- Forbidden: merge, deploy, tag, force-push, mainnet/funds, docker, secrets.

## What to build

1. **WebAuthn primitives in `src/lib/passkey.ts`**
   - `generateAuthenticationOptions()` — challenge with `rpId: "nuri.com"`, `userVerification: "required"`, omit `allowCredentials`.
   - `verifyAuthenticationResponse(response)` — verify assertion server-side using `@simplewebauthn/server` or inline WebCrypto/BigInt.

2. **Challenge store**
   - Use an in-memory Map or Redis for MVP. Export `challengeStore` with `set(challenge)` and `getAndDelete(challengeId)`.

3. **Username resolution**
   - After passkey verification, accept a `username` from the client and bind it to the credential ID. For MVP store `credentialId -> username` in a JSON file or KV.
   - Future: resolve via Nuri credential-hint endpoint.

4. **API routes**
   - `POST /api/auth/challenge` — return `{ challengeId, options }`.
   - `POST /api/auth/verify` — verify response, create/update credential->username mapping, issue signed JWT HTTP-only cookie (`nuri_session`). Return `{ username }`.
   - `POST /api/auth/logout` — clear cookie.
   - `GET /api/me` — return `{ username }` from JWT or 401.

5. **UI components**
   - `src/components/auth.tsx`:
     - `PasskeySignInButton` — calls `navigator.credentials.get`, posts to `/api/auth/verify`.
     - `UserMenu` — shows username + logout.
   - `src/app/login/page.tsx` — minimal page with "Sign in with Nuri passkey" button.

6. **Middleware**
   - `src/middleware.ts` — allow read-only pages to be public. Protect `POST /api/feedback` and `POST /api/feedback/*/vote` by validating the JWT.

## Notes

- Host origin must be `*.nuri.com` for `rpId: "nuri.com"` to be valid.
- Use `jose` for JWT signing/verification with a secret from `process.env.AUTH_SECRET` (add to `src/lib/env.ts` as optional? No — do NOT edit env.ts; instead read process.env directly and fail if missing).
- Keep components Tailwind-only.

## Acceptance

- `pnpm run build` and `tsc --noEmit` pass.
- `/login` renders and the sign-in flow works end-to-end with a real passkey (or mocked `navigator.credentials.get` for UI tests).
- `POST /api/feedback` without a valid cookie returns 401.
