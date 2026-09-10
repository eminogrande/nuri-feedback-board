import { randomBytes } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import {
  generateAuthenticationOptions as generateOptions,
  verifyAuthenticationResponse as verifyResponse,
} from "@simplewebauthn/server";
import { z } from "zod";
import { getPasskeyOrigin, USERNAME_PATTERN } from "./auth";

export const CHALLENGE_COOKIE = "nuri_challenge";
export const CHALLENGE_TTL_SECONDS = 300;
const base64url = z.string().min(1).max(32768).regex(/^[A-Za-z0-9_-]+$/)
  .refine(value => Buffer.from(value, "base64url").toString("base64url") === value);
const credentialId = base64url.refine(value => value.length <= 2048);
export const verificationSchema = z.object({
  challengeId: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  username: z.string().regex(USERNAME_PATTERN),
  response: z.object({
    id: credentialId, rawId: credentialId, type: z.literal("public-key"),
    response: z.object({
      clientDataJSON: base64url, authenticatorData: base64url, signature: base64url,
      userHandle: base64url.nullish(),
    }).strict(),
    clientExtensionResults: z.object({}).strict(),
  }).strict(),
}).strict();

const registrySchema = z.array(z.object({
  credentialId,
  // Trusted COSE public key from the original Nuri registration, never supplied by /verify.
  publicKey: base64url,
  counter: z.number().int().min(0).max(0xffffffff),
  username: z.string().regex(USERNAME_PATTERN).optional(),
  userHandle: base64url.optional(),
}).strict()).superRefine((entries, context) => {
  const ids = new Set<string>();
  const usernames = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.credentialId) || (entry.username && usernames.has(entry.username.toLowerCase()))) {
      context.addIssue({ code: "custom", message: "Duplicate credential or username in registry" });
    }
    ids.add(entry.credentialId);
    if (entry.username) usernames.add(entry.username.toLowerCase());
  }
});

type Challenge = { challenge: string; origin: string; expiresAt: number };
type State = { challenges: Map<string, Challenge>; queue: Promise<unknown> };
// ponytail: one Node worker only; use shared atomic storage before horizontal scaling.
const globalState = globalThis as typeof globalThis & { nuriFeedbackAuth?: State };
const state = globalState.nuriFeedbackAuth ??= { challenges: new Map(), queue: Promise.resolve() };

export class PasskeyError extends Error {
  constructor(message: string, public status = 401) { super(message); }
}

export const challengeStore = {
  set(challenge: string): string {
    const now = Date.now();
    for (const [id, value] of state.challenges) {
      if (value.expiresAt <= now) state.challenges.delete(id);
    }
    if (state.challenges.size >= 1000) throw new PasskeyError("Too many pending sign-ins. Try again shortly.", 429);
    const id = randomBytes(32).toString("base64url");
    state.challenges.set(id, { challenge, origin: getPasskeyOrigin(), expiresAt: now + CHALLENGE_TTL_SECONDS * 1000 });
    return id;
  },
  getAndDelete(id: string): Challenge | undefined {
    const value = state.challenges.get(id);
    state.challenges.delete(id);
    return value && value.expiresAt > Date.now() ? value : undefined;
  },
};

export const challengeCookieOptions = {
  httpOnly: true, secure: true, sameSite: "strict" as const,
  path: "/api/auth", maxAge: CHALLENGE_TTL_SECONDS,
};

export function generateAuthenticationOptions() {
  return generateOptions({ rpID: "nuri.com", userVerification: "required", timeout: 60000 });
}

function registryPath(): string {
  const path = process.env.NURI_PASSKEY_STORE_PATH;
  if (!path) throw new PasskeyError("Nuri passkey registry is not configured.", 503);
  return path;
}

async function readRegistry() {
  try {
    return registrySchema.parse(JSON.parse(await readFile(registryPath(), "utf8")));
  } catch {
    throw new PasskeyError("Nuri passkey registry is unavailable.", 503);
  }
}

export async function assertPasskeyRegistryAvailable(): Promise<void> {
  await readRegistry();
}

export async function verifyAuthenticationResponse(input: z.infer<typeof verificationSchema>) {
  const challenge = challengeStore.getAndDelete(input.challengeId);
  if (!challenge || challenge.origin !== getPasskeyOrigin()) {
    throw new PasskeyError("Sign-in expired or already used. Please try again.");
  }
  // Serialize read/verify/write so parallel assertions cannot race the stored counter or username.
  const operation = state.queue.then(async () => {
    const records = await readRegistry();
    const record = records.find(entry => entry.credentialId === input.response.id);
    if (!record) throw new PasskeyError("This passkey is not linked to the feedback board yet.");
    let result;
    try {
      const client = JSON.parse(Buffer.from(input.response.response.clientDataJSON, "base64url").toString("utf8"));
      if (client.crossOrigin === true || client.topOrigin !== undefined) throw new Error("Cross-origin ceremony");
      if (record.userHandle && input.response.response.userHandle !== record.userHandle) throw new Error("Wrong user handle");
      result = await verifyResponse({
        response: {
          ...input.response,
          response: { ...input.response.response, userHandle: input.response.response.userHandle ?? undefined },
        },
        expectedChallenge: challenge.challenge,
        expectedOrigin: challenge.origin,
        expectedRPID: "nuri.com",
        requireUserVerification: true,
        credential: { id: record.credentialId, publicKey: new Uint8Array(Buffer.from(record.publicKey, "base64url")), counter: record.counter },
      });
    } catch {
      throw new PasskeyError("Passkey verification failed. Please try again.");
    }
    if (!result.verified) throw new PasskeyError("Passkey verification failed. Please try again.");
    if (records.some(entry => entry !== record && entry.username?.toLowerCase() === input.username.toLowerCase())) {
      throw new PasskeyError("That feedback username is already in use.", 409);
    }
    record.username = input.username;
    record.counter = result.authenticationInfo.newCounter;
    const path = registryPath();
    // Same-directory rename keeps the previous registry intact if writing fails.
    try {
      await writeFile(`${path}.tmp`, JSON.stringify(records, null, 2) + "\n", { mode: 0o600 });
      await rename(`${path}.tmp`, path);
    } catch {
      throw new PasskeyError("Could not save your sign-in. Please try again later.", 503);
    }
    return { username: record.username, credentialId: record.credentialId };
  });
  state.queue = operation.catch(() => undefined);
  return operation;
}
