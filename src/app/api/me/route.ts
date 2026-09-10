import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    return session
      ? NextResponse.json({ username: session.username }, { headers })
      : NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  } catch {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503, headers });
  }
}
