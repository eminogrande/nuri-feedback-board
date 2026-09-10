import { getFeedbackItem } from "@/lib/data";
import { feedbackIssueNumber } from "@/lib/types";
import { errorResponse, json, type FeedbackContext } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: FeedbackContext) {
  const { id } = await context.params;
  if (feedbackIssueNumber(id) === null) return json({ error: "Invalid feedback id." }, 400);
  try {
    const item = await getFeedbackItem(id);
    return item ? json(item) : json({ error: "Feedback not found." }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}
