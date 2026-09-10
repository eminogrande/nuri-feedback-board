import { NextRequest, NextResponse } from "next/server";
import { getAuthKey, isAllowedAuthOrigin } from "@/lib/auth";
import { assertPasskeyRegistryAvailable, CHALLENGE_COOKIE, challengeCookieOptions, challengeStore, generateAuthenticationOptions, PasskeyError } from "@/lib/passkey";
import { authErrorResponse, noStore } from "../http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedAuthOrigin(request)) throw new PasskeyError("Untrusted request origin.", 403);
    getAuthKey();
    await assertPasskeyRegistryAvailable();
    const previous = request.cookies.get(CHALLENGE_COOKIE)?.value;
    if (previous) challengeStore.getAndDelete(previous);
    const options = await generateAuthenticationOptions();
    const challengeId = challengeStore.set(options.challenge);
    const response = NextResponse.json({ challengeId, options }, { headers: noStore });
    response.cookies.set(CHALLENGE_COOKIE, challengeId, challengeCookieOptions);
    return response;
  } catch (error) { return authErrorResponse(error); }
}
