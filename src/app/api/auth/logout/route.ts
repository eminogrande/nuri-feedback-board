import { NextRequest, NextResponse } from "next/server";
import { isAllowedAuthOrigin, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { CHALLENGE_COOKIE, challengeCookieOptions, challengeStore, PasskeyError } from "@/lib/passkey";
import { authErrorResponse, noStore } from "../http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedAuthOrigin(request)) throw new PasskeyError("Untrusted request origin.", 403);
    const challengeId = request.cookies.get(CHALLENGE_COOKIE)?.value;
    if (challengeId) challengeStore.getAndDelete(challengeId);
    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
    response.cookies.set(CHALLENGE_COOKIE, "", { ...challengeCookieOptions, maxAge: 0 });
    return response;
  } catch (error) { return authErrorResponse(error); }
}
