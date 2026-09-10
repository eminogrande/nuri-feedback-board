import { z } from "zod";

export const categories = ["feature", "bug", "improvement"] as const;
export const statuses = [
  "New",
  "Under Review",
  "Planned",
  "In Progress",
  "Accepted",
  "Paid",
  "Dismissed",
] as const;

export type Category = (typeof categories)[number];
export type Status = (typeof statuses)[number];

export interface FeedbackItem {
  /** The repository issue number, serialized for /api/feedback/[id]. */
  id: string;
  number: number;
  title: string;
  body: string;
  category: Category;
  status: Status;
  votes: number;
  createdAt: string;
  /** Display attribution only; never proof of identity or payout authorization. */
  author: string;
}

export const createFeedbackSchema = z.object({
  title: z.string().trim().min(1).max(256),
  description: z.string().trim().min(1).max(60000),
  category: z.enum(categories),
  author: z.string().trim().min(1).max(200).regex(/^[^\r\n\u0000-\u001f\u007f]+$/),
}).strict();

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export function feedbackIssueNumber(id: string): number | null {
  if (!/^[1-9]\d*$/.test(id)) return null;
  const number = Number(id);
  return Number.isSafeInteger(number) ? number : null;
}
