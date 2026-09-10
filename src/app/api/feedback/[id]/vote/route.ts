import { addFeedbackVote } from "@/lib/github";
import { feedbackIssueNumber } from "@/lib/types";
import { errorResponse, json, type FeedbackContext } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: FeedbackContext) {
  const number = feedbackIssueNumber((await context.params).id);
  if (number === null) return json({ error: "Invalid feedback id." }, 400);
  try {
    const votes = await addFeedbackVote(number);
    return votes === null ? json({ error: "Feedback not found." }, 404) : json({ votes });
  } catch (error) {
    return errorResponse(error);
  }
}
