import { NextRequest, NextResponse } from "next/server";
import { isAllowedAuthOrigin, SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  if (request.method !== "POST") return NextResponse.next();
  const headers = { "Cache-Control": "no-store" };
  try {
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
    // SameSite alone does not protect against a compromised sibling nuri.com origin.
    if (!isAllowedAuthOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403, headers });
    const forwarded = new Headers(request.headers);
    // Downstream routes must use this verified identity, never the submitted author field.
    forwarded.set("x-nuri-username", session.username);
    forwarded.set("x-nuri-credential-id", session.credentialId);
    return NextResponse.next({ request: { headers: forwarded } });
  } catch {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503, headers });
  }
}

export const config = { matcher: ["/api/feedback/:path*"] };
