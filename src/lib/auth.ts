import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const SESSION_COOKIE = "nuri_session";
export const SESSION_MAX_AGE = 24 * 60 * 60;
export const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,31}$/;
const issuer = "nuri-feedback-board";
const audience = "nuri-feedback-board:web";

export type Session = { username: string; credentialId: string };

export function getAuthKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession({ username, credentialId }: Session): Promise<string> {
  if (!USERNAME_PATTERN.test(username) || !/^[A-Za-z0-9_-]{1,2048}$/.test(credentialId)) {
    throw new Error("Invalid session identity");
  }
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(credentialId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getAuthKey());
}

// Edge-compatible: middleware must verify the signature, not merely decode the cookie.
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token || token.length > 8192) return null;
  const key = getAuthKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"], issuer, audience, typ: "JWT",
      requiredClaims: ["sub", "username", "iat", "exp"],
      maxTokenAge: `${SESSION_MAX_AGE}s`,
    });
    if (typeof payload.username !== "string" || !USERNAME_PATTERN.test(payload.username)
      || typeof payload.sub !== "string" || !/^[A-Za-z0-9_-]{1,2048}$/.test(payload.sub)) return null;
    return { username: payload.username, credentialId: payload.sub };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true, secure: true, sameSite: "strict" as const,
  path: "/", maxAge: SESSION_MAX_AGE,
};

export function getPasskeyOrigin(): string {
  const configured = process.env.NURI_PASSKEY_ORIGIN;
  if (!configured) throw new Error("NURI_PASSKEY_ORIGIN is required");
  const url = new URL(configured);
  if (configured !== url.origin || url.protocol !== "https:"
    || !(url.hostname === "nuri.com" || url.hostname.endsWith(".nuri.com"))) {
    throw new Error("NURI_PASSKEY_ORIGIN must be an exact HTTPS origin under nuri.com");
  }
  return url.origin;
}

export function isAllowedAuthOrigin(request: Request): boolean {
  return request.headers.get("origin") === getPasskeyOrigin();
}
