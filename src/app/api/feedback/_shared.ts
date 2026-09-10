import { NextResponse } from "next/server";
import { FeedbackProjectSyncError, GitHubError } from "@/lib/github";

export type FeedbackContext = { params: Promise<{ id: string }> };

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(error: unknown) {
  if (error instanceof FeedbackProjectSyncError) {
    return json({ error: error.message, issueCreated: true, item: error.item }, 502);
  }
  if (error instanceof GitHubError) {
    const status = [400, 404, 503].includes(error.status) ? error.status : 502;
    return json({ error: error.message }, status);
  }
  // Never expose upstream response bodies, private keys, or request headers.
  return json({ error: "Feedback service is unavailable." }, 502);
}
