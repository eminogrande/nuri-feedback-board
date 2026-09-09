# Task Packet 04 — Nuri passkey authentication

- Repo: `eminogrande/nuri-feedback-board` (local: `~/Developer/nuri-feedback-board`)
- Base branch: `main` (will merge on top of packet-01 branch)
- Target branch: `hermes-subagent/passkey-auth`
- Allowed paths: `src/lib/auth.ts`, `src/lib/passkey.ts`, `src/app/api/auth/**/*`, `src/components/auth.tsx`, `src/app/login/**/*`, `src/middleware.ts`, `CHANGELOG.md`
- Protected: `package.json` version, CI workflow, docs
- Verify: `pnpm install && pnpm run build`
- Done when: A user can click "Sign in with Nuri passkey", complete WebAuthn, and the UI shows their Nuri username.
- Out of scope: Payout destination resolution, GitHub API writes, persistent sessions beyond a signed JWT cookie.
- Forbidden: merge, deploy, tag, force-push, mainnet/funds, docker, secrets.

## What to build

1. **WebAuthn primitives in `src/lib/passkey.ts`**
   - `generateRegistrationOptions(username: string)` — for Nuri passkey setup flow, if needed.
   - `generateAuthenticationOptions()` — challenge with `rpId: "nuri.com"`, `userVerification: "required"`, **omit** `allowCredentials` so the OS picker shows all passkeys.
   - `verifyAuthenticationResponse(response)` — verify the assertion server-side using a challenge store (Redis/in-memory KV for MVP).

2. **Nuri username resolution**
   - After passkey authentication, resolve the credential ID to a Nuri username via Nuri's credential-hint endpoint or a PRF-derived wallet identifier.
   - For the MVP, accept a Nuri username typed by the user and bind it to the verified passkey credential; store mapping `credentialId -> username`.

3. **API routes**
   - `POST /api/auth/challenge` — return WebAuthn challenge.
   - `POST /api/auth/verify` — verify response, create/update `credentialId -> username` mapping, issue signed JWT cookie.
   - `POST /api/auth/logout` — clear cookie.
   - `GET /api/me` — return `{ username }` from JWT.

4. **UI components**
   - `PasskeyButton` — triggers `navigator.credentials.get`, posts response to `/api/auth/verify`.
   - `UserMenu` — shows username + logout.

5. **Middleware**
   - Protect `/feedback` submit action so only authenticated users can POST.
   - Public pages remain readable without auth.

## Notes

- Host origin must be `*.nuri.com` so `rpId: "nuri.com"` is valid.
- Use `@simplewebauthn/server` and `@simplewebauthn/browser` if they fit; otherwise inline WebCrypto/BigInt crypto as in Nuri standalone debug pages.
- Store username in the JWT payload; no server-side session required beyond challenge KV.

## Acceptance

- `pnpm run build` passes.
- `/login` page has a working passkey sign-in button (requires real passkey/authenticator for end-to-end test; verify UI paths with mocked `navigator.credentials.get`).
- After sign-in, the header shows the username.
