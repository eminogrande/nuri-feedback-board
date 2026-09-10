import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { SignJWT } from "jose/jwt/sign";
import { chromium } from "playwright";
import { createSession, getAuthKey, getPasskeyOrigin, SESSION_COOKIE, verifySession } from "../../../lib/auth";
import { challengeStore, generateAuthenticationOptions } from "../../../lib/passkey";
import { middleware } from "../../../middleware";
import { POST as challenge } from "./challenge/route";
import { POST as verify } from "./verify/route";
import { POST as logout } from "./logout/route";
import { GET as me } from "../me/route";

const origin = "https://feedback.nuri.com";

function fixture() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = publicKey.export({ format: "jwk" });
  // COSE EC2/P-256/-7 key; the only persisted test key is public.
  const cose = Buffer.concat([Buffer.from("a5010203262001215820", "hex"), Buffer.from(jwk.x!, "base64url"), Buffer.from("225820", "hex"), Buffer.from(jwk.y!, "base64url")]);
  const credentialId = randomBytes(32).toString("base64url");
  const userHandle = randomBytes(32).toString("base64url");
  return {
    record: { credentialId, publicKey: cose.toString("base64url"), userHandle, counter: 0 },
    privateKey,
    assertion(challenge: string, options: { origin?: string; rpId?: string; flags?: number; counter?: number; crossOrigin?: boolean; type?: string; key?: typeof privateKey } = {}) {
      const clientDataJSON = Buffer.from(JSON.stringify({ type: options.type ?? "webauthn.get", challenge, origin: options.origin ?? origin, crossOrigin: options.crossOrigin ?? false }));
      const counter = Buffer.alloc(4);
      counter.writeUInt32BE(options.counter ?? 1);
      const authenticatorData = Buffer.concat([createHash("sha256").update(options.rpId ?? "nuri.com").digest(), Buffer.from([options.flags ?? 5]), counter]);
      const signature = sign("sha256", Buffer.concat([authenticatorData, createHash("sha256").update(clientDataJSON).digest()]), options.key ?? privateKey);
      return {
        id: credentialId, rawId: credentialId, type: "public-key",
        response: { clientDataJSON: clientDataJSON.toString("base64url"), authenticatorData: authenticatorData.toString("base64url"), signature: signature.toString("base64url"), userHandle },
        clientExtensionResults: {},
      };
    },
  };
}

function request(path: string, body?: unknown, cookie?: string, requestOrigin = origin, method = "POST") {
  return new NextRequest(`${origin}${path}`, {
    method, headers: { origin: requestOrigin, ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function begin() {
  const response = await challenge(request("/api/auth/challenge"));
  assert.equal(response.status, 200, await response.clone().text());
  const body = await response.json();
  assert.match(response.headers.get("set-cookie")!, /HttpOnly/);
  assert.match(response.headers.get("set-cookie")!, /Secure/);
  assert.match(response.headers.get("set-cookie")!, /SameSite=strict/i);
  assert.equal(body.options.rpId, "nuri.com");
  assert.equal(body.options.userVerification, "required");
  assert.equal(body.options.allowCredentials, undefined);
  return { ...body, cookie: `nuri_challenge=${body.challengeId}` };
}

function sessionRequest(token?: string, path = "/api/feedback", method = "POST", requestOrigin = origin) {
  return request(path, undefined, token ? `${SESSION_COOKIE}=${token}` : undefined, requestOrigin, method);
}

// Run after pnpm build: pnpm exec tsx --test src/app/api/auth/auth.test.ts
// Chrome is used only for the final local, unfunded virtual-authenticator test.
test("passkey verification, sessions, middleware, and browser lifecycle", async t => {
  const directory = await mkdtemp(join(process.cwd(), ".next/auth-tests-"));
  process.env.AUTH_SECRET = randomBytes(48).toString("base64url");
  process.env.NURI_PASSKEY_ORIGIN = origin;
  process.env.NURI_PASSKEY_STORE_PATH = join(directory, "credentials.json");
  const key = fixture();
  const other = fixture();
  const reset = () => writeFile(process.env.NURI_PASSKEY_STORE_PATH!, JSON.stringify([key.record, { ...other.record, username: "taken" }]));
  try {
    await reset();
    await t.test("single-use expiring unpredictable browser-bound challenges", async () => {
      const first = await begin();
      const second = await generateAuthenticationOptions();
      assert.notEqual(first.options.challenge, second.challenge);
      assert.ok(Buffer.from(first.options.challenge, "base64url").length >= 32);
      assert.ok(challengeStore.getAndDelete(first.challengeId));
      assert.equal(challengeStore.getAndDelete(first.challengeId), undefined);
      const expired = challengeStore.set(second.challenge);
      const now = Date.now();
      t.mock.method(Date, "now", () => now + 301000);
      assert.equal(challengeStore.getAndDelete(expired), undefined);
      t.mock.restoreAll();
      const pending = await begin();
      const body = { challengeId: pending.challengeId, username: "alice", response: key.assertion(pending.options.challenge) };
      assert.equal((await verify(request("/api/auth/verify", body))).status, 401);
      challengeStore.getAndDelete(pending.challengeId);
    });

    await t.test("valid signed assertion persists username/counter and issues readable, secure session", async () => {
      const pending = await begin();
      const body = { challengeId: pending.challengeId, username: "alice", response: key.assertion(pending.options.challenge) };
      const response = await verify(request("/api/auth/verify", body, pending.cookie));
      assert.equal(response.status, 200, await response.clone().text());
      assert.deepEqual(await response.json(), { username: "alice" });
      const token = response.cookies.get(SESSION_COOKIE)!.value;
      assert.deepEqual(await verifySession(token), { username: "alice", credentialId: key.record.credentialId });
      const cookie = response.cookies.get(SESSION_COOKIE)!;
      assert.equal(cookie.httpOnly, true);
      assert.equal(cookie.secure, true);
      assert.equal(cookie.sameSite, "strict");
      assert.equal(cookie.path, "/");
      assert.equal(cookie.domain, undefined);
      const who = await me(sessionRequest(token, "/api/me", "GET"));
      assert.equal(who.status, 200);
      assert.deepEqual(await who.json(), { username: "alice" });
      const records = JSON.parse(await readFile(process.env.NURI_PASSKEY_STORE_PATH!, "utf8"));
      assert.equal(records[0].counter, 1);
      assert.equal(records[0].username, "alice");
      assert.equal((await verify(request("/api/auth/verify", body, pending.cookie))).status, 401);
      const signedOut = await logout(sessionRequest(token, "/api/auth/logout"));
      assert.equal(signedOut.status, 200);
      assert.equal(signedOut.cookies.get(SESSION_COOKIE)?.maxAge, 0);
      assert.equal((await me(sessionRequest(undefined, "/api/me", "GET"))).status, 401);
    });

    for (const [name, options] of Object.entries({
      "wrong signature": { key: other.privateKey },
      "wrong origin": { origin: "https://app.nuri.com" },
      "wrong rpId": { rpId: "feedback.nuri.com" },
      "missing user verification": { flags: 1 },
      "missing user presence": { flags: 4 },
      "cross-origin ceremony": { crossOrigin: true },
      "wrong ceremony type": { type: "webauthn.create" },
      "replayed signature counter": { counter: 1 },
    })) {
      await t.test(`rejects ${name} and consumes challenge`, async () => {
        const pending = await begin();
        const body = { challengeId: pending.challengeId, username: "alice", response: key.assertion(pending.options.challenge, { counter: 2, ...options }) };
        assert.equal((await verify(request("/api/auth/verify", body, pending.cookie))).status, 401);
        assert.equal(challengeStore.getAndDelete(pending.challengeId), undefined);
      });
    }

    await t.test("rejects wrong challenge, raw ID, user handle, unknown credentials, and supplied keys", async () => {
      for (const mutate of [
        (response: ReturnType<typeof key.assertion>) => { response.response = key.assertion(randomBytes(32).toString("base64url"), { counter: 2 }).response; },
        (response: ReturnType<typeof key.assertion>) => { response.rawId = other.record.credentialId; },
        (response: ReturnType<typeof key.assertion>) => { response.response.userHandle = other.record.userHandle; },
        (response: ReturnType<typeof key.assertion>) => { response.id = response.rawId = randomBytes(32).toString("base64url"); },
      ]) {
        const pending = await begin();
        const response = key.assertion(pending.options.challenge, { counter: 2 });
        mutate(response);
        assert.equal((await verify(request("/api/auth/verify", { challengeId: pending.challengeId, username: "alice", response }, pending.cookie))).status, 401);
      }
      const pending = await begin();
      assert.equal((await verify(request("/api/auth/verify", { challengeId: pending.challengeId, username: "alice", response: key.assertion(pending.options.challenge), publicKey: other.record.publicKey }, pending.cookie))).status, 400);
    });

    await t.test("rejects duplicate usernames, malformed/oversized requests and foreign request origins", async () => {
      const pending = await begin();
      assert.equal((await verify(request("/api/auth/verify", { challengeId: pending.challengeId, username: "TAKEN", response: key.assertion(pending.options.challenge, { counter: 2 }) }, pending.cookie))).status, 409);
      const records = JSON.parse(await readFile(process.env.NURI_PASSKEY_STORE_PATH!, "utf8"));
      assert.equal(records[0].username, "alice");
      assert.equal(records[0].counter, 1);
      assert.equal((await verify(request("/api/auth/verify", {}))).status, 400);
      assert.equal((await verify(request("/api/auth/verify", "x".repeat(65537)))).status, 413);
      assert.equal((await challenge(request("/api/auth/challenge", undefined, undefined, "https://evil.nuri.com"))).status, 403);
      assert.equal((await logout(request("/api/auth/logout", undefined, undefined, "https://evil.nuri.com"))).status, 403);
    });

    await t.test("JWT rejects tampering, expiry, missing claims, wrong issuer/audience/key", async () => {
      const token = await createSession({ username: "alice", credentialId: key.record.credentialId });
      const parts = token.split(".");
      parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].substring(1);
      assert.equal(await verifySession(parts.join(".")), null);
      for (const kind of ["expiry", "issuer", "audience", "missing-exp", "key"]) {
        const jwt = new SignJWT({ username: "alice" }).setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .setSubject(key.record.credentialId).setIssuedAt()
          .setIssuer(kind === "issuer" ? "elsewhere" : "nuri-feedback-board")
          .setAudience(kind === "audience" ? "elsewhere" : "nuri-feedback-board:web");
        if (kind !== "missing-exp") jwt.setExpirationTime(kind === "expiry" ? "-1s" : "1h");
        assert.equal(await verifySession(await jwt.sign(kind === "key" ? randomBytes(32) : getAuthKey())), null);
      }
    });

    await t.test("middleware protects feedback/votes and overwrites forged author headers; reads remain public", async () => {
      assert.equal((await middleware(sessionRequest())).status, 401);
      assert.equal((await middleware(sessionRequest("invalid", "/api/feedback/1/vote"))).status, 401);
      assert.equal((await middleware(sessionRequest(undefined, "/api/feedback", "GET"))).status, 200);
      const token = await createSession({ username: "alice", credentialId: key.record.credentialId });
      const incoming = sessionRequest(token);
      incoming.headers.set("x-nuri-username", "attacker");
      const allowed = await middleware(incoming);
      assert.equal(allowed.status, 200);
      assert.equal(allowed.headers.get("x-middleware-request-x-nuri-username"), "alice");
      assert.equal((await middleware(sessionRequest(token, "/api/feedback", "POST", "https://evil.nuri.com"))).status, 403);
    });

    await t.test("missing/weak auth configuration and unavailable registries fail closed", async () => {
      const secret = process.env.AUTH_SECRET;
      process.env.AUTH_SECRET = "short";
      assert.equal((await challenge(request("/api/auth/challenge"))).status, 503);
      process.env.AUTH_SECRET = secret;
      process.env.NURI_PASSKEY_ORIGIN = "https://nuri.com.attacker.test";
      assert.throws(getPasskeyOrigin);
      process.env.NURI_PASSKEY_ORIGIN = origin;
      const path = process.env.NURI_PASSKEY_STORE_PATH;
      process.env.NURI_PASSKEY_STORE_PATH = `${path}.absent`;
      assert.equal((await challenge(request("/api/auth/challenge"))).status, 503);
      process.env.NURI_PASSKEY_STORE_PATH = path;
    });

    await t.test("zero counters support synced passkeys; concurrent counters cannot race", async () => {
      await reset();
      for (let i = 0; i < 2; i++) {
        const pending = await begin();
        const body = { challengeId: pending.challengeId, username: "alice", response: key.assertion(pending.options.challenge, { counter: 0 }) };
        assert.equal((await verify(request("/api/auth/verify", body, pending.cookie))).status, 200);
      }
      const results = await Promise.all([await begin(), await begin()].map(pending =>
        verify(request("/api/auth/verify", { challengeId: pending.challengeId, username: "alice", response: key.assertion(pending.options.challenge, { counter: 1 }) }, pending.cookie))));
      assert.deepEqual(results.map(result => result.status).sort(), [200, 401]);
    });

    await t.test("production Next.js UI signs in and logs out with a real browser virtual Nuri passkey", async () => {
      await reset();
      const socket = createServer().listen(0, "127.0.0.1");
      await once(socket, "listening");
      const address = socket.address();
      assert.ok(address && typeof address !== "string");
      const port = address.port;
      await new Promise<void>(resolve => socket.close(() => resolve()));
      const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
      let logs = "";
      server.stdout.on("data", data => { logs += data; });
      server.stderr.on("data", data => { logs += data; });
      let browser;
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error(`Next server startup timed out: ${logs}`)), 30000);
          server.on("exit", code => { clearTimeout(timeout); reject(new Error(`Next server exited ${code}: ${logs}`)); });
          server.stdout.on("data", data => { if (String(data).includes("Ready in")) { clearTimeout(timeout); resolve(); } });
        });
        const local = `http://127.0.0.1:${port}`;
        assert.equal((await fetch(`${local}/login`)).status, 200);
        assert.equal((await fetch(`${local}/api/feedback`, { method: "POST" })).status, 401);
        assert.equal((await fetch(`${local}/api/feedback/1/vote`, { method: "POST" })).status, 401);
        browser = await chromium.launch({ channel: process.env.AUTH_TEST_BROWSER_CHANNEL || "chrome", headless: true });
        const context = await browser.newContext();
        await context.route(`${origin}/**`, async route => {
          const url = new URL(route.request().url());
          const response = await route.fetch({ url: `${local}${url.pathname}${url.search}` });
          await route.fulfill({ response });
        });
        const page = await context.newPage();
        const client = await context.newCDPSession(page);
        await client.send("WebAuthn.enable");
        const { authenticatorId } = await client.send("WebAuthn.addVirtualAuthenticator", {
          options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
        });
        await client.send("WebAuthn.addCredential", { authenticatorId, credential: {
          credentialId: Buffer.from(key.record.credentialId, "base64url").toString("base64"),
          isResidentCredential: true, rpId: "nuri.com", signCount: 0,
          privateKey: key.privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
          userHandle: Buffer.from(key.record.userHandle, "base64url").toString("base64"),
        } });
        await page.goto(`${origin}/login`);
        await page.getByLabel("Feedback username").fill("@invalid");
        assert.equal(await page.getByLabel("Feedback username").evaluate(input => (input as HTMLInputElement).checkValidity()), false);
        await page.getByLabel("Feedback username").fill("browser-user");
        await page.getByRole("button", { name: "Sign in with Nuri passkey" }).click();
        await page.getByRole("button", { name: "Log out", exact: true }).waitFor({ timeout: 15000 });
        assert.ok((await page.locator("body").innerText()).includes("Signed in as browser-user"));
        const cookies = await context.cookies();
        const session = cookies.find(cookie => cookie.name === SESSION_COOKIE);
        assert.ok(session?.httpOnly && session.secure && session.sameSite === "Strict");
        assert.equal(await page.evaluate(async () => (await fetch("/api/me")).status), 200);
        // Packet 03 supplies the destination handler; authenticated middleware must let this through.
        assert.equal(await page.evaluate(async () => (await fetch("/api/feedback", { method: "POST" })).status), 404);
        await page.screenshot({ path: join(process.cwd(), ".next/auth-test-login.png"), fullPage: true });
        await page.getByRole("button", { name: "Log out", exact: true }).click();
        await page.getByText("You are not signed in.", { exact: true }).waitFor();
        assert.equal(await page.evaluate(async () => (await fetch("/api/me")).status), 401);
        assert.equal(await page.evaluate(async () => (await fetch("/api/feedback", { method: "POST" })).status), 401);
        assert.ok(!(await context.cookies()).some(cookie => cookie.name === SESSION_COOKIE));
        assert.ok(!(await page.locator("body").innerText()).includes("Signed in as browser-user"));
        await page.evaluate(() => {
          navigator.credentials.get = async () => { throw new DOMException("Cancelled", "NotAllowedError"); };
        });
        await page.getByRole("button", { name: "Sign in with Nuri passkey" }).click();
        await page.getByRole("alert").filter({ hasText: "cancelled or timed out" }).waitFor();
        assert.equal(await page.getByRole("button", { name: "Sign in with Nuri passkey" }).isEnabled(), true);
        await page.setViewportSize({ width: 320, height: 740 });
        assert.equal(await page.locator("main").evaluate(main => main.scrollWidth <= main.clientWidth), true);
      } finally {
        await browser?.close();
        const exited = once(server, "exit");
        server.kill("SIGTERM");
        if (server.exitCode === null) await exited;
      }
    });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
