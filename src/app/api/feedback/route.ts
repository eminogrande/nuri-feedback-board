import { createFeedbackItem, getFeedbackItems } from "@/lib/data";
import { createFeedbackSchema } from "@/lib/types";
import { errorResponse, json } from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await getFeedbackItems());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "Content-Type must be application/json." }, 415);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }
  const input = createFeedbackSchema.safeParse(body);
  if (!input.success) {
    return json({ error: "Invalid feedback input.", details: input.error.flatten() }, 400);
  }
  try {
    return json(await createFeedbackItem(input.data), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
