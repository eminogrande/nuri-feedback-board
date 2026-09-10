import { NextRequest, NextResponse } from "next/server";
import { createSession, getAuthKey, isAllowedAuthOrigin, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { CHALLENGE_COOKIE, challengeCookieOptions, challengeStore, PasskeyError, verificationSchema, verifyAuthenticationResponse } from "@/lib/passkey";
import { authErrorResponse, noStore, readAuthBody } from "../http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let browserChallenge: string | undefined;
  let response: NextResponse;
  try {
    if (!isAllowedAuthOrigin(request)) throw new PasskeyError("Untrusted request origin.", 403);
    getAuthKey();
    browserChallenge = request.cookies.get(CHALLENGE_COOKIE)?.value;
    const body = verificationSchema.parse(await readAuthBody(request));
    if (!browserChallenge || browserChallenge !== body.challengeId) throw new PasskeyError("Sign-in browser session does not match. Please try again.");
    const identity = await verifyAuthenticationResponse(body);
    response = NextResponse.json({ username: identity.username }, { headers: noStore });
    response.cookies.set(SESSION_COOKIE, await createSession(identity), sessionCookieOptions);
  } catch (error) { response = authErrorResponse(error); }
  if (browserChallenge) {
    challengeStore.getAndDelete(browserChallenge);
    response.cookies.set(CHALLENGE_COOKIE, "", { ...challengeCookieOptions, maxAge: 0 });
  }
  return response;
}
