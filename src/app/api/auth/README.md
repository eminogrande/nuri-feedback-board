# Feedback-board passkey authentication

This is an authentication-only relying party for existing `nuri.com` credentials. It does not create replacement passkeys, request PRF output, derive wallet keys, or contact a payout service.

## Required configuration

- `AUTH_SECRET`: a cryptographically random secret of at least 32 bytes, supplied by the deployment secret manager. There is no development fallback. Existing sessions stop verifying when this changes.
- `NURI_PASSKEY_ORIGIN`: the exact HTTPS origin of this board, normally `https://feedback.nuri.com`, without a trailing slash. Both request origins and the signed WebAuthn `clientDataJSON.origin` must match. The RP ID stays `nuri.com`, including during local tests.
- `NURI_PASSKEY_STORE_PATH`: an existing, writable JSON file on persistent storage, outside the source checkout and the web/public directory. Restrict it to the application operator. Its parent directory must already exist.

The registry contains a JSON array of records:

| Field | Format / source |
| --- | --- |
| `credentialId` | Canonical unpadded base64url credential ID from a trusted Nuri registration |
| `publicKey` | Canonical unpadded base64url **COSE** public-key bytes from that registration, not SPKI, not a wallet public key |
| `counter` | Last known authenticator signature counter (unsigned 32-bit integer) |
| `userHandle` | Optional canonical base64url WebAuthn user handle; if supplied, assertions must match |
| `username` | Optional feedback display name; otherwise chosen during the first verified sign-in |

**Provisioning is a prerequisite.** WebAuthn authentication assertions do not include the credential public key. Sharing the `nuri.com` RP ID permits selection of existing passkeys; it does not give this server their registered public keys. Obtain the ID/key/counter records through a trusted Nuri registration export or implement a separately authenticated credential lookup. The task provides neither a trusted lookup contract nor an existing key registry. Unknown credentials are rejected; `/api/auth/verify` never accepts a client-supplied key or creates an unverified credential. Missing/unreadable configuration returns 503 rather than a session.

Once a known passkey verifies, its username and counter are saved by same-directory atomic rename. Names are 3–32 ASCII letters/numbers/dots/underscores/hyphens, start with a letter or number, and cannot duplicate another credential's name case-insensitively. The verified credential owner may change their own name on a later sign-in. **These are self-declared feedback names, not verified Nuri usernames and never payout destinations.** A trusted Nuri username resolver remains separate future work.

## HTTP contract

| Endpoint | Behavior |
| --- | --- |
| `POST /api/auth/challenge` | Returns `{ challengeId, options }`; sets a browser-bound challenge cookie; options require user verification and omit `allowCredentials` |
| `POST /api/auth/verify` | Accepts `{ challengeId, username, response }` with the serialized WebAuthn assertion; returns `{ username }` and sets `nuri_session` only after verification and persistence |
| `POST /api/auth/logout` | Clears both session and challenge cookies |
| `GET /api/me` | Returns `{ username }` from a valid JWT, otherwise 401 |
| `POST /api/feedback` and descendants | Middleware requires a verified JWT and exact request origin; anonymous requests return 401 |

All authentication responses use `Cache-Control: no-store`. POST authentication endpoints require the configured `Origin` header. Verify additionally requires JSON and limits the streamed body to 64 KiB. The challenge is random, valid for five minutes, single-use even after a failed verification, and bound to the initiating browser's HTTP-only cookie. A new challenge replaces that browser's old pending ceremony.

The session lasts 24 hours, is signed with HS256, and validates algorithm, issuer, audience, issued-at, expiration, subject, and username. Cookies are host-only, Secure, HTTP-only, and SameSite=Strict. Logout clears the current browser session; an already-stolen bearer token remains valid until expiration or secret rotation. No server-side session revocation store is included.

### Packet 03 integration

Middleware overwrites `x-nuri-username` and `x-nuri-credential-id` on authenticated feedback POSTs. Downstream issue/vote handlers must derive the author from those verified headers (or call `verifySession` themselves), **not** from a client-submitted `author`. This packet does not edit the feedback API or other public pages. `UserMenu` and `PasskeySignInButton` are exported for those pages to adopt; `/login` already renders them.

### MVP limits

Use exactly one persistent Node.js worker. The challenge Map and serialization queue are process-local; server restarts invalidate pending ceremonies. A shared transactional store with atomic challenge consumption, counter comparison, and username uniqueness is required before multi-worker/serverless deployment. The Map caps pending challenges at 1,000; add reverse-proxy per-client rate limits before public exposure. The registry is public-key metadata, but its integrity is an authentication trust boundary.

## Verification

```sh
pnpm install
pnpm run lint
pnpm run build
npx tsc --noEmit -p tsconfig.json
pnpm exec tsx --test src/app/api/auth/auth.test.ts
```

The final test launches a local production Next.js server and an isolated headless Chrome profile. It intercepts the test board's HTTPS origin and serves only local responses, keeping the real `nuri.com` RP/origin checks intact without changing DNS or trusting a certificate. It installs a fresh P-256 credential into Chrome's native CDP virtual authenticator and exercises the actual `navigator.credentials.get`, verification, signed-cookie, username, feedback middleware, and logout flow. No personal browser profile, existing Nuri passkey, real registration service, or funds are used. This proves a browser-native **software test authenticator**, not hardware/Touch ID/Face ID/provider-sync compatibility.

Chrome must be installed. To use Playwright-managed Chromium instead, run `pnpm exec playwright install chromium` then `AUTH_TEST_BROWSER_CHANNEL=chromium pnpm exec tsx --test src/app/api/auth/auth.test.ts`. The screenshot is written to `.next/auth-test-login.png`; temporary public-key registry files are cleaned up by the test.

The tests also sign genuine assertions for wrong signature, challenge, RP ID, origin, cross-origin framing, user verification/presence, counter, credential ID, and user-handle negatives; check one-time expiry, request validation, username uniqueness, trusted-key enforcement, JWT tampering/expiry/claims, and public-read/protected-write behavior. Runtime configuration and a trusted real-key export still need operator provisioning before an existing user's Nuri passkey can sign in.
