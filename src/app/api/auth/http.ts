import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { PasskeyError } from "@/lib/passkey";

export const noStore = { "Cache-Control": "no-store" };

export function authErrorResponse(error: unknown) {
  if (error instanceof PasskeyError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid sign-in request." }, { status: 400, headers: noStore });
  }
  return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503, headers: noStore });
}

export async function readAuthBody(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new PasskeyError("Expected application/json.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new PasskeyError("Missing sign-in request.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new PasskeyError("Sign-in request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
